package service

import (
	"context"
	"time"

	"golang.org/x/sync/singleflight"
)

// browseFlight merges concurrent misses of the same key into one upstream call.
var browseFlight singleflight.Group

// Keys come from user input (genre/playlist id), so bound the cache size.
const browseCacheMax = 500

// Upper bound for one shared fetch (may chain several innertube calls).
const browseFetchTimeout = 30 * time.Second

type browseEntry struct {
	data   any
	expiry time.Time
}

// cachedBrowse returns the cached value for key, or calls fetch and caches its result.
// fetch gets a context detached from the caller: singleflight shares one fetch
// between concurrent callers, so one caller hanging up must not fail the others.
func cachedBrowse[T any](ctx context.Context, s *musicService, key string, ttl time.Duration, fetch func(ctx context.Context) (T, error)) (T, error) {
	now := time.Now()
	s.browseMu.Lock()
	if entry, ok := s.browseCache[key]; ok && now.Before(entry.expiry) {
		s.browseMu.Unlock()
		return entry.data.(T), nil
	}
	s.browseMu.Unlock()

	// The fetch also writes the cache, so its result is kept even if every caller hung up.
	ch := browseFlight.DoChan(key, func() (any, error) {
		fetchCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), browseFetchTimeout)
		defer cancel()
		data, err := fetch(fetchCtx)
		if err != nil {
			return nil, err
		}
		s.storeBrowse(key, data, ttl)
		return data, nil
	})
	var zero T
	var res singleflight.Result
	select {
	case <-ctx.Done():
		return zero, ctx.Err()
	case res = <-ch:
	}
	if res.Err != nil {
		return zero, res.Err
	}
	return res.Val.(T), nil
}

func (s *musicService) storeBrowse(key string, data any, ttl time.Duration) {
	now := time.Now()
	s.browseMu.Lock()
	defer s.browseMu.Unlock()
	if len(s.browseCache) >= browseCacheMax {
		oldestKey, oldest := "", time.Time{}
		for k, entry := range s.browseCache {
			if now.After(entry.expiry) {
				delete(s.browseCache, k)
			} else if oldestKey == "" || entry.expiry.Before(oldest) {
				oldestKey, oldest = k, entry.expiry
			}
		}
		// Still full: drop the entry closest to expiring so new keys stay cacheable.
		if len(s.browseCache) >= browseCacheMax {
			delete(s.browseCache, oldestKey)
		}
	}
	s.browseCache[key] = browseEntry{data: data, expiry: now.Add(ttl)}
}

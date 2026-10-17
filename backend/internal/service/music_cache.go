package service

import "time"

// Keys come from user input (genre/playlist id), so bound the cache size.
const browseCacheMax = 500

type browseEntry struct {
	data   any
	expiry time.Time
}

// cachedBrowse returns the cached value for key, or calls fetch and caches its result.
func cachedBrowse[T any](s *musicService, key string, ttl time.Duration, fetch func() (T, error)) (T, error) {
	now := time.Now()
	s.browseMu.Lock()
	if entry, ok := s.browseCache[key]; ok && now.Before(entry.expiry) {
		s.browseMu.Unlock()
		return entry.data.(T), nil
	}
	s.browseMu.Unlock()

	data, err := fetch()
	if err != nil {
		return data, err
	}

	s.browseMu.Lock()
	defer s.browseMu.Unlock()
	if len(s.browseCache) >= browseCacheMax {
		for k, entry := range s.browseCache {
			if now.After(entry.expiry) {
				delete(s.browseCache, k)
			}
		}
	}
	if len(s.browseCache) < browseCacheMax {
		s.browseCache[key] = browseEntry{data: data, expiry: now.Add(ttl)}
	}
	return data, nil
}

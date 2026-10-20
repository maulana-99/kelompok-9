package service

import (
	"context"
	"errors"
	"testing"
	"time"
)

func TestCachedBrowseCallerCancelDoesNotFailSharedFetch(t *testing.T) {
	s := &musicService{browseCache: map[string]browseEntry{}}
	release := make(chan struct{})
	fetch := func(ctx context.Context) (int, error) {
		<-release
		return 7, ctx.Err()
	}

	ctxA, cancelA := context.WithCancel(context.Background())
	errA := make(chan error, 1)
	go func() {
		_, err := cachedBrowse(ctxA, s, "k", time.Minute, fetch)
		errA <- err
	}()
	time.Sleep(20 * time.Millisecond) // A owns the in-flight fetch

	type result struct {
		v   int
		err error
	}
	resB := make(chan result, 1)
	go func() {
		v, err := cachedBrowse(context.Background(), s, "k", time.Minute, fetch)
		resB <- result{v, err}
	}()
	time.Sleep(20 * time.Millisecond)

	cancelA()
	if err := <-errA; !errors.Is(err, context.Canceled) {
		t.Fatalf("caller A: want context.Canceled, got %v", err)
	}
	close(release)
	if r := <-resB; r.err != nil || r.v != 7 {
		t.Fatalf("caller B: got %+v", r)
	}
}

func TestCachedBrowseCachesEvenWhenCallerLeft(t *testing.T) {
	s := &musicService{browseCache: map[string]browseEntry{}}
	release := make(chan struct{})
	done := make(chan struct{})
	ctx, cancel := context.WithCancel(context.Background())
	go func() {
		_, _ = cachedBrowse(ctx, s, "k", time.Minute, func(context.Context) (int, error) {
			defer close(done)
			<-release
			return 7, nil
		})
	}()
	time.Sleep(20 * time.Millisecond)
	cancel()
	close(release)
	<-done
	time.Sleep(20 * time.Millisecond) // storeBrowse runs right after fetch returns

	v, err := cachedBrowse(context.Background(), s, "k", time.Minute, func(context.Context) (int, error) {
		return 0, errors.New("should be cached")
	})
	if err != nil || v != 7 {
		t.Fatalf("got %d, %v", v, err)
	}
}

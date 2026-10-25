package service

import (
	"testing"
	"time"

	"backend/internal/model"
)

func TestSearchStateWindow(t *testing.T) {
	st := &searchState{
		items: []model.MusicResult{
			{VideoID: "a"}, {VideoID: "b"}, {VideoID: "c"}, {VideoID: "d"}, {VideoID: "e"},
		},
		seen:   make(map[string]bool),
		expiry: time.Now().Add(time.Minute),
	}

	cases := []struct {
		name            string
		offset, limit   int
		wantIDs         []string
		wantHasMore     bool
	}{
		{"first page full", 0, 2, []string{"a", "b"}, true},
		{"middle page", 2, 2, []string{"c", "d"}, true},
		{"exact tail no more", 4, 2, []string{"e"}, false},
		{"offset beyond end", 9, 2, []string{}, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			items, hasMore := st.window(tc.offset, tc.limit)
			if hasMore != tc.wantHasMore {
				t.Errorf("hasMore = %v, want %v", hasMore, tc.wantHasMore)
			}
			if len(items) != len(tc.wantIDs) {
				t.Fatalf("got %d items, want %d", len(items), len(tc.wantIDs))
			}
			for i, id := range tc.wantIDs {
				if items[i].VideoID != id {
					t.Errorf("items[%d] = %q, want %q", i, items[i].VideoID, id)
				}
			}
		})
	}

	// Window returns a copy — mutating it must not touch the cache.
	items, _ := st.window(0, 5)
	items[0] = model.MusicResult{VideoID: "mutated"}
	if again, _ := st.window(0, 1); again[0].VideoID != "a" {
		t.Errorf("window aliases cached items: got %q", again[0].VideoID)
	}
}

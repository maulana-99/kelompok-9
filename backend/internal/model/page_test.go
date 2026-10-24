package model

import "testing"

func TestNewPage(t *testing.T) {
	cases := []struct {
		name         string
		items        int
		page, limit  int
		total        int64
		wantTotal    int
		wantHasMore  bool
	}{
		{"first of three pages", 2, 1, 2, 5, 3, true},
		{"last page exact", 1, 3, 2, 5, 3, false},
		{"last page short", 2, 3, 4, 10, 3, false},
		{"empty result", 0, 1, 20, 0, 0, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			items := make([]User, tc.items)
			p := NewPage(items, tc.page, tc.limit, tc.total)
			if p.TotalPages != tc.wantTotal {
				t.Errorf("TotalPages = %d, want %d", p.TotalPages, tc.wantTotal)
			}
			if p.HasMore != tc.wantHasMore {
				t.Errorf("HasMore = %v, want %v", p.HasMore, tc.wantHasMore)
			}
			if len(p.Items) != tc.items {
				t.Errorf("len(Items) = %d, want %d", len(p.Items), tc.items)
			}
		})
	}

	// Nil items must serialize as [] instead of null.
	if p := NewPage[int](nil, 1, 20, 0); p.Items == nil {
		t.Error("NewPage(nil) should normalize Items to an empty slice")
	}
}

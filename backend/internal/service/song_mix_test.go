package service

import (
	"backend/internal/model"
	"fmt"
	"testing"
)

func TestPrimaryArtist(t *testing.T) {
	cases := map[string]string{
		"Joji":                        "Joji",
		"Joji & Diplo":                "Joji",
		"The Chainsmokers & Coldplay": "The Chainsmokers",
		"Rich Brian, Joji":            "Rich Brian",
		"Mahalini feat. Rizky Febian": "Mahalini",
		"":                            "",
	}
	for in, want := range cases {
		if got := primaryArtist(in); got != want {
			t.Errorf("primaryArtist(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestSampleStaysInTopPoolAndSkipsUsed(t *testing.T) {
	pool := []model.MusicResult{}
	for i := 0; i < 50; i++ {
		pool = append(pool, track(fmt.Sprintf("s%02d", i), "A"))
	}
	used := map[string]bool{"s00": true}
	got := sample(pool, 4, ReasonSimilar, used)
	if len(got) != 4 {
		t.Fatalf("want 4, got %d", len(got))
	}
	for _, tr := range got {
		if tr.VideoID == "s00" || tr.VideoID > fmt.Sprintf("s%02d", 4*songMixPoolRatio) {
			t.Fatalf("picked %s outside top pool or already used", tr.VideoID)
		}
		if tr.Reason != ReasonSimilar || !used[tr.VideoID] {
			t.Fatalf("pick %s not labeled/marked", tr.VideoID)
		}
	}
}

func TestSampleShuffles(t *testing.T) {
	pool := []model.MusicResult{}
	for i := 0; i < 30; i++ {
		pool = append(pool, track(fmt.Sprintf("s%02d", i), "A"))
	}
	orders := map[string]bool{}
	for i := 0; i < 20; i++ {
		orders[fmt.Sprint(sample(pool, 5, ReasonSimilar, map[string]bool{}))] = true
	}
	if len(orders) < 2 {
		t.Fatal("sample returned the same order 20 times")
	}
}

func TestSpreadArtistsAvoidsBackToBack(t *testing.T) {
	in := []model.MixTrack{
		{MusicResult: track("seed", "Joji"), Reason: ReasonSeed},
		{MusicResult: track("j1", "Joji")},
		{MusicResult: track("j2", "Joji")},
		{MusicResult: track("o1", "Other")},
		{MusicResult: track("o2", "Else")},
	}
	out := spreadArtists(in)
	if out[0].VideoID != "seed" {
		t.Fatalf("seed must stay first, got %s", out[0].VideoID)
	}
	for i := 1; i < len(out); i++ {
		if out[i].Artist == out[i-1].Artist {
			t.Fatalf("back-to-back %s at %d: %v", out[i].Artist, i, out)
		}
	}
}

func TestArtistMatchesWholeNamesOnly(t *testing.T) {
	cases := []struct {
		credit, name string
		want         bool
	}{
		{"88rising & Joji", "Joji", true},
		{"Joji", "joji", true},
		{"Jojiko", "Joji", false},
		{"Eve", "Eve", true},
		{"Steve Lacy", "Eve", false},
		{"Rich Brian, Joji & Diplo", "Diplo", true},
		{"Joji", "", false},
	}
	for _, c := range cases {
		if got := artistMatches(c.credit, c.name); got != c.want {
			t.Errorf("artistMatches(%q, %q) = %v, want %v", c.credit, c.name, got, c.want)
		}
	}
}

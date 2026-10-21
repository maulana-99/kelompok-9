package service

import (
	"backend/internal/model"
	"fmt"
	"testing"
)

func track(id, artist string) model.MusicResult {
	return model.MusicResult{VideoID: id, Title: "t-" + id, Artist: artist}
}

// radio builds a seed radio: the seed first, then related songs.
func radio(seed model.MusicResult, related ...model.MusicResult) []model.MusicResult {
	return append([]model.MusicResult{seed}, related...)
}

func TestScoreCandidatesPrefersSongsSeveralSeedsAgreeOn(t *testing.T) {
	a := newRecSeed("seedA", 1, radio(track("seedA", "X"), track("only-a", "P"), track("shared", "Q"), track("a2", "P"), track("a3", "P")))
	b := newRecSeed("seedB", 1, radio(track("seedB", "Y"), track("only-b", "R"), track("shared", "Q"), track("b2", "R"), track("b3", "R")))

	ranked := scoreCandidates([]*recSeed{a, b})
	if ranked[0].VideoID != "shared" {
		t.Fatalf("want shared first, got %v", ranked[0].VideoID)
	}
}

func TestClusterSeedsGroupsOverlappingRadiosAndSameArtist(t *testing.T) {
	common := []model.MusicResult{track("c1", "P"), track("c2", "Q"), track("c3", "R")}
	rock1 := newRecSeed("rock1", 3, radio(track("rock1", "Band"), common...))
	rock2 := newRecSeed("rock2", 2, radio(track("rock2", "Other"), common...))
	sameArtist := newRecSeed("rock3", 1, radio(track("rock3", "band"), track("z1", "Z")))
	dangdut := newRecSeed("dang", 1.5, radio(track("dang", "Rhoma"), track("d1", "D"), track("d2", "E")))

	clusters := clusterSeeds([]*recSeed{rock1, rock2, dangdut, sameArtist})
	if len(clusters) != 2 {
		t.Fatalf("want 2 clusters, got %d", len(clusters))
	}
	if len(clusters[0]) != 3 || clusters[0][0].id != "rock1" {
		t.Fatalf("heaviest cluster should hold the 3 rock seeds led by rock1, got %+v", clusters[0])
	}
}

func TestBuildMixInterleavesFamiliarAndCapsArtists(t *testing.T) {
	related := []model.MusicResult{track("known1", "K")}
	for i := 0; i < 40; i++ {
		related = append(related, track(fmt.Sprintf("new%02d", i), fmt.Sprintf("artist%d", i%10)))
	}
	seed := newRecSeed("seed", 1, radio(track("seed", "S"), related...))
	known := map[string]bool{"seed": true, "known1": true}

	mix := buildMix(1, []*recSeed{seed}, known)
	if len(mix.Tracks) != recMixSize {
		t.Fatalf("want %d tracks, got %d", recMixSize, len(mix.Tracks))
	}
	if mix.Tracks[0].VideoID != "seed" || mix.Tracks[recFamiliarEvery].VideoID != "known1" {
		t.Fatalf("familiar songs should sit at slots 0 and %d, got %s, %s", recFamiliarEvery, mix.Tracks[0].VideoID, mix.Tracks[recFamiliarEvery].VideoID)
	}
	perArtist := map[string]int{}
	seen := map[string]bool{}
	for _, tr := range mix.Tracks {
		perArtist[tr.Artist]++
		if seen[tr.VideoID] {
			t.Fatalf("duplicate track %s", tr.VideoID)
		}
		seen[tr.VideoID] = true
	}
	for artist, n := range perArtist {
		if n > recMixArtistCap {
			t.Fatalf("artist %s has %d songs, cap %d", artist, n, recMixArtistCap)
		}
	}
}

func TestPickDiverseSkipsKnownForDiscovery(t *testing.T) {
	ranked := []model.MusicResult{track("a", "X"), track("b", "X"), track("c", "X"), track("d", "Y")}
	known := map[string]bool{"a": true}
	got := pickDiverse(ranked, func(t model.MusicResult) bool { return !known[t.VideoID] }, 10, 2, nil)
	ids := []string{}
	for _, t := range got {
		ids = append(ids, t.VideoID)
	}
	if fmt.Sprint(ids) != "[b c d]" {
		t.Fatalf("got %v", ids)
	}
}

func TestRoundRobinAlternatesClusters(t *testing.T) {
	rock := []model.MusicResult{track("r1", "A"), track("r2", "B"), track("r3", "C")}
	dangdut := []model.MusicResult{track("d1", "D"), track("r2", "B")}
	ids := []string{}
	for _, t := range roundRobin([][]model.MusicResult{rock, dangdut}) {
		ids = append(ids, t.VideoID)
	}
	if fmt.Sprint(ids) != "[r1 d1 r2 r3]" {
		t.Fatalf("got %v", ids)
	}
}

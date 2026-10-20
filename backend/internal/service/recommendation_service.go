package service

import (
	"backend/internal/model"
	"backend/internal/repository"
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"
)

// Recommendations follow the Spotify "Daily Mix" idea: group what the user
// already listens to into clusters, then extend each cluster with similar
// songs. Similarity comes from YouTube Music radio (its own collaborative
// filtering), so the backend only has to pick seeds, cluster, score and mix.
const (
	recHistoryWindow   = 50  // newest history rows used as taste signal
	recReplayWeight    = 0.2 // extra weight per replay (capped at 10 replays)
	recPlaylistWeight  = 0.6 // a song saved in the user's playlist counts as explicit taste
	recMaxSeeds        = 8   // radios fetched per request (cached 1h each)
	recMaxMixes        = 4   // like "My Mix 1-4"
	recMixSize         = 25
	recForYouSize      = 20
	recMixArtistCap    = 3 // max songs per artist inside one mix
	recForYouArtistCap = 2
	recClusterJaccard  = 0.2 // radios sharing >=20% of songs belong to one taste cluster
	recFamiliarEvery   = 4   // every 4th slot of a mix is a song the user already knows
	recRadioParallel   = 4   // upstream calls in flight per request
	recRadioTimeout    = 10 * time.Second
)

// ErrRecommendationUpstream means YouTube Music could not be reached for any seed.
var ErrRecommendationUpstream = errors.New("youtube music tidak dapat dihubungi")

type RecommendationService interface {
	ForUser(ctx context.Context, userID int) (*model.Recommendations, error)
	// SongMix builds a shuffled "up next" queue from one song (see song_mix.go).
	SongMix(ctx context.Context, userID int, videoID string) ([]model.MixTrack, error)
}

type recommendationService struct {
	history repository.HistoryRepository
	songs   repository.PlaylistSongRepository
	music   MusicService
}

func NewRecommendationService(history repository.HistoryRepository, songs repository.PlaylistSongRepository, music MusicService) RecommendationService {
	return &recommendationService{history: history, songs: songs, music: music}
}

type recSeed struct {
	id      string
	weight  float64
	meta    model.MusicResult
	related []model.MusicResult // radio without the seed itself
	set     map[string]bool
}

func (s *recommendationService) ForUser(ctx context.Context, userID int) (*model.Recommendations, error) {
	empty := &model.Recommendations{Mixes: []model.MusicMix{}, ForYou: []model.MusicResult{}}

	usable, known, err := s.taste(ctx, userID, recMaxSeeds)
	if err != nil {
		return nil, err
	}
	if len(usable) == 0 {
		return empty, nil // cold start: frontend keeps showing genre shelves
	}

	// 4. Cluster seeds that sound alike, 5. build one mix per cluster.
	clusters := clusterSeeds(usable)
	if len(clusters) > recMaxMixes {
		clusters = clusters[:recMaxMixes]
	}
	result := &model.Recommendations{Mixes: make([]model.MusicMix, 0, len(clusters))}
	for i, cluster := range clusters {
		result.Mixes = append(result.Mixes, buildMix(i+1, cluster, known))
	}

	// 6. "For you": pure discovery, taking turns between clusters so one taste
	// does not drown the others, and nothing the user already knows.
	perCluster := make([][]model.MusicResult, len(clusters))
	for i, cluster := range clusters {
		perCluster[i] = scoreCandidates(cluster)
	}
	result.ForYou = pickDiverse(roundRobin(perCluster), func(t model.MusicResult) bool { return !known[t.VideoID] }, recForYouSize, recForYouArtistCap, nil)
	return result, nil
}

// roundRobin merges ranked lists by taking one from each in turn, skipping duplicates.
func roundRobin(lists [][]model.MusicResult) []model.MusicResult {
	out := []model.MusicResult{}
	seen := make(map[string]bool)
	for pos := 0; ; pos++ {
		added := false
		for _, list := range lists {
			if pos >= len(list) {
				continue
			}
			added = true
			if t := list[pos]; !seen[t.VideoID] {
				seen[t.VideoID] = true
				out = append(out, t)
			}
		}
		if !added {
			return out
		}
	}
}

// taste turns history (recency + play count) and own playlist songs into
// weighted seeds, each extended with its radio. known holds every song the
// user has already played or saved.
func (s *recommendationService) taste(ctx context.Context, userID, maxSeeds int) ([]*recSeed, map[string]bool, error) {
	// 1. Taste signal: recent plays (newer = heavier) plus songs saved in own playlists.
	weights := make(map[string]float64)
	entries, err := s.history.FindByUser(userID, recHistoryWindow)
	if err != nil {
		return nil, nil, err
	}
	for rank, entry := range entries {
		weights[entry.MusicID] += 1/(1+0.15*float64(rank)) + recReplayWeight*float64(min(entry.PlayCount-1, 10))
	}
	saved, err := s.songs.MusicIDsByOwner(userID)
	if err != nil {
		return nil, nil, err
	}
	for _, id := range saved {
		if musicIDPattern.MatchString(id) {
			weights[id] += recPlaylistWeight
		}
	}
	if len(weights) == 0 {
		return nil, nil, nil
	}
	known := make(map[string]bool, len(weights))
	for id := range weights {
		known[id] = true
	}

	// 2. Seeds: strongest signals first.
	ids := make([]string, 0, len(weights))
	for id := range weights {
		ids = append(ids, id)
	}
	sort.Slice(ids, func(i, j int) bool {
		if weights[ids[i]] != weights[ids[j]] {
			return weights[ids[i]] > weights[ids[j]]
		}
		return ids[i] < ids[j]
	})
	if len(ids) > maxSeeds {
		ids = ids[:maxSeeds]
	}

	// 3. Extend every seed with its YouTube Music radio (parallel, cached per seed).
	radioCtx, cancel := context.WithTimeout(ctx, recRadioTimeout)
	defer cancel()
	seeds := make([]*recSeed, len(ids))
	errs := make([]error, len(ids))
	slots := make(chan struct{}, recRadioParallel)
	var wg sync.WaitGroup
	for i, id := range ids {
		wg.Add(1)
		go func(i int, id string) {
			defer wg.Done()
			slots <- struct{}{}
			defer func() { <-slots }()
			radio, err := s.music.Radio(radioCtx, id)
			if err != nil {
				errs[i] = err
				return
			}
			seeds[i] = newRecSeed(id, weights[id], radio)
		}(i, id)
	}
	wg.Wait()

	usable := make([]*recSeed, 0, len(seeds))
	for _, seed := range seeds {
		if seed != nil && len(seed.related) > 0 {
			usable = append(usable, seed)
		}
	}
	if len(usable) == 0 {
		if err := errors.Join(errs...); err != nil {
			return nil, known, fmt.Errorf("%w: %v", ErrRecommendationUpstream, err)
		}
	}
	return usable, known, nil
}

func newRecSeed(id string, weight float64, radio []model.MusicResult) *recSeed {
	seed := &recSeed{id: id, weight: weight, meta: model.MusicResult{VideoID: id}, set: make(map[string]bool)}
	for _, t := range radio {
		if t.VideoID == id {
			seed.meta = t
			continue
		}
		seed.related = append(seed.related, t)
		seed.set[t.VideoID] = true
	}
	return seed
}

// clusterSeeds joins seeds by the same artist or overlapping radios
// (union-find), heaviest cluster first.
func clusterSeeds(seeds []*recSeed) [][]*recSeed {
	parent := make([]int, len(seeds))
	for i := range parent {
		parent[i] = i
	}
	var find func(int) int
	find = func(i int) int {
		if parent[i] != i {
			parent[i] = find(parent[i])
		}
		return parent[i]
	}
	for i := range seeds {
		for j := i + 1; j < len(seeds); j++ {
			a, b := seeds[i], seeds[j]
			sameArtist := a.meta.Artist != "" && strings.EqualFold(a.meta.Artist, b.meta.Artist)
			if sameArtist || jaccard(a.set, b.set) >= recClusterJaccard {
				parent[find(i)] = find(j)
			}
		}
	}

	groups := make(map[int][]*recSeed)
	order := []int{}
	for i, seed := range seeds {
		root := find(i)
		if _, ok := groups[root]; !ok {
			order = append(order, root)
		}
		groups[root] = append(groups[root], seed) // seeds stay sorted by weight
	}
	clusters := make([][]*recSeed, 0, len(order))
	for _, root := range order {
		clusters = append(clusters, groups[root])
	}
	sort.SliceStable(clusters, func(i, j int) bool { return clusterWeight(clusters[i]) > clusterWeight(clusters[j]) })
	return clusters
}

func clusterWeight(cluster []*recSeed) float64 {
	total := 0.0
	for _, seed := range cluster {
		total += seed.weight
	}
	return total
}

func jaccard(a, b map[string]bool) float64 {
	if len(a) == 0 || len(b) == 0 {
		return 0
	}
	shared := 0
	for id := range a {
		if b[id] {
			shared++
		}
	}
	return float64(shared) / float64(len(a)+len(b)-shared)
}

// scoreCandidates ranks radio songs: score = sum over seeds of
// seed weight * (1 - position / radio length). A song several seeds agree on
// rises to the top.
func scoreCandidates(seeds []*recSeed) []model.MusicResult {
	score := make(map[string]float64)
	meta := make(map[string]model.MusicResult)
	for _, seed := range seeds {
		n := float64(len(seed.related))
		for pos, t := range seed.related {
			score[t.VideoID] += seed.weight * (1 - float64(pos)/n)
			if _, ok := meta[t.VideoID]; !ok {
				meta[t.VideoID] = t
			}
		}
	}
	ranked := make([]model.MusicResult, 0, len(meta))
	for _, t := range meta {
		ranked = append(ranked, t)
	}
	sort.Slice(ranked, func(i, j int) bool {
		a, b := ranked[i].VideoID, ranked[j].VideoID
		if score[a] != score[b] {
			return score[a] > score[b]
		}
		return a < b
	})
	return ranked
}

// pickDiverse takes tracks in order, skipping filtered ones and artists over the cap.
// artistCount is shared when the caller fills one list in several passes.
func pickDiverse(tracks []model.MusicResult, keep func(model.MusicResult) bool, limit, artistCap int, artistCount map[string]int) []model.MusicResult {
	if artistCount == nil {
		artistCount = make(map[string]int)
	}
	out := []model.MusicResult{}
	for _, t := range tracks {
		if len(out) >= limit {
			break
		}
		artist := strings.ToLower(t.Artist)
		if !keep(t) || (artist != "" && artistCount[artist] >= artistCap) {
			continue
		}
		artistCount[artist]++
		out = append(out, t)
	}
	return out
}

// buildMix interleaves familiar songs (seeds + known radio songs) with new ones,
// like Daily Mix: mostly discovery, anchored by songs the user already likes.
func buildMix(n int, cluster []*recSeed, known map[string]bool) model.MusicMix {
	ranked := scoreCandidates(cluster)
	familiarPool := make([]model.MusicResult, 0, len(cluster))
	for _, seed := range cluster {
		if seed.meta.Title != "" {
			familiarPool = append(familiarPool, seed.meta)
		}
	}
	for _, t := range ranked {
		if known[t.VideoID] {
			familiarPool = append(familiarPool, t)
		}
	}

	artistCount := make(map[string]int)
	maxFamiliar := (recMixSize + recFamiliarEvery - 1) / recFamiliarEvery
	familiar := pickDiverse(familiarPool, func(model.MusicResult) bool { return true }, maxFamiliar, recMixArtistCap, artistCount)
	fresh := pickDiverse(ranked, func(t model.MusicResult) bool { return !known[t.VideoID] }, recMixSize-len(familiar), recMixArtistCap, artistCount)

	tracks := make([]model.MusicResult, 0, recMixSize)
	used := make(map[string]bool)
	for slot := 0; len(familiar)+len(fresh) > 0 && len(tracks) < recMixSize; slot++ {
		var next model.MusicResult
		if (slot%recFamiliarEvery == 0 && len(familiar) > 0) || len(fresh) == 0 {
			next, familiar = familiar[0], familiar[1:]
		} else {
			next, fresh = fresh[0], fresh[1:]
		}
		if !used[next.VideoID] {
			used[next.VideoID] = true
			tracks = append(tracks, next)
		}
	}

	seedIDs := make([]string, 0, len(cluster))
	for _, seed := range cluster {
		seedIDs = append(seedIDs, seed.id)
	}
	top := cluster[0].meta
	thumbnail := top.Thumbnail
	if thumbnail == "" && len(tracks) > 0 {
		thumbnail = tracks[0].Thumbnail
	}
	return model.MusicMix{
		ID:        top.VideoID,
		Title:     fmt.Sprintf("Mix %d", n),
		Subtitle:  mixSubtitle(tracks),
		Thumbnail: thumbnail,
		Seeds:     seedIDs,
		Tracks:    tracks,
	}
}

// mixSubtitle lists the three most frequent artists, e.g. "Coldplay, Keane, Oasis, dan lainnya".
func mixSubtitle(tracks []model.MusicResult) string {
	count := make(map[string]int)
	order := []string{}
	for _, t := range tracks {
		if t.Artist == "" {
			continue
		}
		if count[t.Artist] == 0 {
			order = append(order, t.Artist)
		}
		count[t.Artist]++
	}
	sort.SliceStable(order, func(i, j int) bool { return count[order[i]] > count[order[j]] })
	if len(order) > 3 {
		return strings.Join(order[:3], ", ") + ", dan lainnya"
	}
	return strings.Join(order, ", ")
}

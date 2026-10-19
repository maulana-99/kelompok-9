package service

import (
	"backend/internal/model"
	"context"
	"errors"
	"fmt"
	"math/rand/v2"
	"strings"
	"sync"
)

// A song mix is the "up next" queue started from one song. It blends four
// sources and is reshuffled on every request so replaying a song never gives
// the same queue twice.
const (
	songMixSize      = 30
	songMixArtist    = 6 // other songs by the same artist
	songMixForYou    = 5 // "coba ini, kayaknya kamu suka"
	songMixFavorite  = 5 // songs the user plays the most
	songMixTasteSeed = 4 // taste seeds used for "for you" (radios are cached)
	songMixPoolRatio = 3 // sample from the best n*ratio candidates, not only the top n
	songMixMinPlays  = 2 // a favorite must have been played at least twice
	songMixHops      = 2 // similar songs whose radio feeds "for you"
	songMixHopPool   = 6 // hops are picked at random among the top similar songs

	ReasonSeed     = "seed"
	ReasonArtist   = "artist"
	ReasonSimilar  = "similar"
	ReasonForYou   = "for_you"
	ReasonFavorite = "favorite"
)

func (s *recommendationService) SongMix(ctx context.Context, userID int, videoID string) ([]model.MixTrack, error) {
	radio, err := s.music.Radio(ctx, videoID)
	if err != nil {
		if errors.Is(err, ErrInvalidMusicID) || errors.Is(err, ErrBrowseNotFound) {
			return nil, err
		}
		return nil, fmt.Errorf("%w: %v", ErrRecommendationUpstream, err)
	}
	seed := newRecSeed(videoID, 1, radio)
	artist := primaryArtist(seed.meta.Artist)
	sameArtist := func(t model.MusicResult) bool { return artistMatches(t.Artist, artist) }

	// Similar / same genre: the radio without the artist's own songs.
	radioArtist, similarPool := []model.MusicResult{}, []model.MusicResult{}
	for _, t := range seed.related {
		if sameArtist(t) {
			radioArtist = append(radioArtist, t)
		} else {
			similarPool = append(similarPool, t)
		}
	}

	// The other sources only need the radio, so fetch them in parallel.
	var (
		wg                sync.WaitGroup
		artistSongs, hops []model.MusicResult
		favoritePool      []model.MusicResult
		tasteSeeds        []*recSeed
		known             map[string]bool
		tasteErr, favErr  error
	)
	wg.Add(4)
	go func() {
		defer wg.Done()
		if artist != "" {
			artistSongs, _ = s.music.ArtistSongs(ctx, artist) // optional source
		}
	}()
	go func() { defer wg.Done(); hops = s.hopRadios(ctx, similarPool) }()
	go func() { defer wg.Done(); tasteSeeds, known, tasteErr = s.taste(ctx, userID, songMixTasteSeed) }()
	go func() { defer wg.Done(); favoritePool, favErr = s.favorites(ctx, userID) }()
	wg.Wait()
	if tasteErr != nil && !errors.Is(tasteErr, ErrRecommendationUpstream) {
		return nil, tasteErr
	}
	if favErr != nil {
		return nil, favErr
	}

	// 1. Same artist: artist search + same-artist songs already in the radio.
	artistPool := append(artistSongs, radioArtist...)

	// 3. For you: second hop. Radios of a few similar songs reach songs this
	// radio does not have, still in the same scope. Songs that also match the
	// user's overall taste go first; songs the user already knows are skipped.
	inTaste := map[string]bool{}
	for _, t := range roundRobin(clusterRanked(clusterSeeds(tasteSeeds))) {
		inTaste[t.VideoID] = true
	}
	matches, others := []model.MusicResult{}, []model.MusicResult{}
	for _, t := range hops {
		if known[t.VideoID] || seed.set[t.VideoID] || sameArtist(t) {
			continue
		}
		if inTaste[t.VideoID] {
			matches = append(matches, t)
		} else {
			others = append(others, t)
		}
	}
	forYouPool := append(matches, others...)

	// 4. Favorites: most played songs (fetched above).
	used := map[string]bool{videoID: true}
	picks := make([]model.MixTrack, 0, songMixSize)
	picks = append(picks, sample(artistPool, songMixArtist, ReasonArtist, used)...)
	picks = append(picks, sample(forYouPool, songMixForYou, ReasonForYou, used)...)
	picks = append(picks, sample(favoritePool, songMixFavorite, ReasonFavorite, used)...)
	// Similar songs fill the rest, including slots other sources could not fill.
	picks = append(picks, sample(similarPool, songMixSize-1-len(picks), ReasonSimilar, used)...)

	rand.Shuffle(len(picks), func(i, j int) { picks[i], picks[j] = picks[j], picks[i] })
	head := model.MixTrack{MusicResult: seed.meta, Reason: ReasonSeed}
	return spreadArtists(append([]model.MixTrack{head}, picks...)), nil
}

// hopRadios fetches the radios of a few random top similar songs (cached 1h)
// and merges them; failures only shrink the pool.
func (s *recommendationService) hopRadios(ctx context.Context, similar []model.MusicResult) []model.MusicResult {
	top := append([]model.MusicResult(nil), similar[:min(len(similar), songMixHopPool)]...)
	rand.Shuffle(len(top), func(i, j int) { top[i], top[j] = top[j], top[i] })
	top = top[:min(len(top), songMixHops)]

	hopCtx, cancel := context.WithTimeout(ctx, recRadioTimeout)
	defer cancel()
	lists := make([][]model.MusicResult, len(top))
	var wg sync.WaitGroup
	for i, t := range top {
		wg.Add(1)
		go func(i int, id string) {
			defer wg.Done()
			if radio, err := s.music.Radio(hopCtx, id); err == nil {
				lists[i] = newRecSeed(id, 1, radio).related
			}
		}(i, t.VideoID)
	}
	wg.Wait()
	return roundRobin(lists)
}

// favorites returns the user's most played songs (played at least twice).
func (s *recommendationService) favorites(ctx context.Context, userID int) ([]model.MusicResult, error) {
	entries, err := s.history.TopPlayed(userID, songMixFavorite*songMixPoolRatio)
	if err != nil {
		return nil, err
	}
	ids := []string{}
	for _, e := range entries {
		if e.PlayCount >= songMixMinPlays && musicIDPattern.MatchString(e.MusicID) {
			ids = append(ids, e.MusicID)
		}
	}
	if len(ids) == 0 {
		return []model.MusicResult{}, nil
	}
	infos, err := s.music.GetInfos(ctx, ids)
	if err != nil {
		return []model.MusicResult{}, nil // favorites are optional, the mix still works
	}
	out := []model.MusicResult{}
	for _, info := range infos {
		if info.Title != "" {
			out = append(out, info)
		}
	}
	return out, nil
}

// clusterRanked scores each taste cluster on its own.
func clusterRanked(clusters [][]*recSeed) [][]model.MusicResult {
	out := make([][]model.MusicResult, len(clusters))
	for i, cluster := range clusters {
		out[i] = scoreCandidates(cluster)
	}
	return out
}

// sample picks n random songs among the best n*songMixPoolRatio unused ones,
// so the mix stays relevant but changes every time.
func sample(pool []model.MusicResult, n int, reason string, used map[string]bool) []model.MixTrack {
	if n <= 0 {
		return nil
	}
	candidates := []model.MusicResult{}
	seen := map[string]bool{}
	for _, t := range pool {
		if used[t.VideoID] || seen[t.VideoID] {
			continue
		}
		seen[t.VideoID] = true
		candidates = append(candidates, t)
		if len(candidates) >= n*songMixPoolRatio {
			break
		}
	}
	rand.Shuffle(len(candidates), func(i, j int) { candidates[i], candidates[j] = candidates[j], candidates[i] })
	if len(candidates) > n {
		candidates = candidates[:n]
	}
	out := make([]model.MixTrack, 0, len(candidates))
	for _, t := range candidates {
		used[t.VideoID] = true
		out = append(out, model.MixTrack{MusicResult: t, Reason: reason})
	}
	return out
}

// spreadArtists reorders tracks so the same artist does not play twice in a
// row when another choice exists. The first track stays in place.
func spreadArtists(tracks []model.MixTrack) []model.MixTrack {
	if len(tracks) < 3 {
		return tracks
	}
	out := []model.MixTrack{tracks[0]}
	rest := append([]model.MixTrack(nil), tracks[1:]...)
	for len(rest) > 0 {
		last := strings.ToLower(out[len(out)-1].Artist)
		pick := 0
		for i, t := range rest {
			// Unknown artists never count as a repeat.
			if last == "" || !strings.EqualFold(t.Artist, last) {
				pick = i
				break
			}
		}
		out = append(out, rest[pick])
		rest = append(rest[:pick], rest[pick+1:]...)
	}
	return out
}

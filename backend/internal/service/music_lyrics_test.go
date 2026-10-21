package service

import (
	"encoding/json"
	"testing"
)

func TestParseLyricsNormalizesLinesAndSource(t *testing.T) {
	raw := `{"contents":{"sectionListRenderer":{"contents":[{"musicDescriptionShelfRenderer":{
		"description":{"runs":[{"text":"line one\r\nline two\r\n"}]},
		"footer":{"runs":[{"text":"Sumber: LyricFind"}]}}}]}}}`
	var parsed ytLyricsResponse
	if err := json.Unmarshal([]byte(raw), &parsed); err != nil {
		t.Fatal(err)
	}
	got := parseLyrics(&parsed)
	if got.Text != "line one\nline two" || got.Source != "LyricFind" {
		t.Fatalf("got %+v", got)
	}
}

func TestParseLyricsEmpty(t *testing.T) {
	if got := parseLyrics(&ytLyricsResponse{}); got.Text != "" {
		t.Fatalf("got %+v", got)
	}
}

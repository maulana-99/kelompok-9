package service

import "strings"

// JSON shapes of YouTube Music (innertube) responses. Each struct mirrors only
// the path to the fields we read; everything else in the response is ignored.

type ytSearchResponse struct {
	Contents *ytSearchContents `json:"contents"`
}

type ytSearchContents struct {
	TabbedSearchResultsRenderer *struct {
		Tabs []ytSearchTab `json:"tabs"`
	} `json:"tabbedSearchResultsRenderer"`
}

type ytSearchTab struct {
	TabRenderer *struct {
		Content *struct {
			SectionListRenderer *struct {
				Contents []ytSearchSection `json:"contents"`
			} `json:"sectionListRenderer"`
		} `json:"content"`
	} `json:"tabRenderer"`
}

type ytSearchSection struct {
	MusicShelfRenderer *ytMusicShelf `json:"musicShelfRenderer"`
	ItemSection        *struct {
		Contents []struct {
			MusicResponsiveListItemRenderer *ytMusicListItem `json:"musicResponsiveListItemRenderer"`
		} `json:"contents"`
	} `json:"itemSectionRenderer"`
}

type ytMusicShelf struct {
	Title *struct {
		Runs []struct {
			Text string `json:"text"`
		} `json:"runs"`
	} `json:"title"`
	Contents []struct {
		MusicResponsiveListItemRenderer *ytMusicListItem `json:"musicResponsiveListItemRenderer"`
	} `json:"contents"`
}

type ytMusicListItem struct {
	FlexColumns []struct {
		MusicResponsiveListItemFlexColumnRenderer *struct {
			Text *struct {
				Runs []struct {
					Text string `json:"text"`
				} `json:"runs"`
			} `json:"text"`
		} `json:"musicResponsiveListItemFlexColumnRenderer"`
	} `json:"flexColumns"`
	FixedColumns []struct {
		MusicResponsiveListItemFixedColumnRenderer *struct {
			Text *struct {
				Runs []struct {
					Text string `json:"text"`
				} `json:"runs"`
			} `json:"text"`
		} `json:"musicResponsiveListItemFixedColumnRenderer"`
	} `json:"fixedColumns"`
	Thumbnail *struct {
		MusicThumbnailRenderer *struct {
			Thumbnail *struct {
				Thumbnails []struct {
					URL string `json:"url"`
				} `json:"thumbnails"`
			} `json:"thumbnail"`
		} `json:"musicThumbnailRenderer"`
	} `json:"thumbnail"`
	PlaylistItemData *struct {
		VideoID string `json:"videoId"`
	} `json:"playlistItemData"`
	Overlay *struct {
		MusicItemThumbnailOverlayRenderer *struct {
			Content *struct {
				MusicPlayButtonRenderer *struct {
					PlayNavigationEndpoint *struct {
						WatchEndpoint *struct {
							WatchEndpointMusicSupportedConfigs *struct {
								WatchEndpointMusicConfig *struct {
									MusicVideoType string `json:"musicVideoType"`
								} `json:"watchEndpointMusicConfig"`
							} `json:"watchEndpointMusicSupportedConfigs"`
						} `json:"watchEndpoint"`
					} `json:"playNavigationEndpoint"`
				} `json:"musicPlayButtonRenderer"`
			} `json:"content"`
		} `json:"musicItemThumbnailOverlayRenderer"`
	} `json:"overlay"`
}

type ytRuns struct {
	Runs []struct {
		Text string `json:"text"`
	} `json:"runs"`
}

func (r *ytRuns) text() string {
	if r == nil {
		return ""
	}
	var sb strings.Builder
	for _, run := range r.Runs {
		sb.WriteString(run.Text)
	}
	return sb.String()
}

type ytThumbnailRenderer struct {
	MusicThumbnailRenderer *struct {
		Thumbnail *struct {
			Thumbnails []struct {
				URL string `json:"url"`
			} `json:"thumbnails"`
		} `json:"thumbnail"`
	} `json:"musicThumbnailRenderer"`
}

// largest returns the last valid thumbnail URL (the largest one).
func (t *ytThumbnailRenderer) largest() string {
	if t == nil || t.MusicThumbnailRenderer == nil || t.MusicThumbnailRenderer.Thumbnail == nil {
		return ""
	}
	url := ""
	for _, th := range t.MusicThumbnailRenderer.Thumbnail.Thumbnails {
		if strings.HasPrefix(th.URL, "http") {
			url = th.URL
		}
	}
	return url
}

type ytBrowseEndpoint struct {
	BrowseID string `json:"browseId"`
	Params   string `json:"params"`
}

type ytGenresResponse struct {
	Contents *struct {
		SingleColumnBrowseResultsRenderer *struct {
			Tabs []struct {
				TabRenderer *struct {
					Content *struct {
						SectionListRenderer *struct {
							Contents []struct {
								GridRenderer *struct {
									Header *struct {
										GridHeaderRenderer *struct {
											Title *ytRuns `json:"title"`
										} `json:"gridHeaderRenderer"`
									} `json:"header"`
									Items []struct {
										MusicNavigationButtonRenderer *struct {
											ButtonText *ytRuns `json:"buttonText"`
											Solid      *struct {
												LeftStripeColor uint32 `json:"leftStripeColor"` // ARGB
											} `json:"solid"`
											ClickCommand *struct {
												BrowseEndpoint *ytBrowseEndpoint `json:"browseEndpoint"`
											} `json:"clickCommand"`
										} `json:"musicNavigationButtonRenderer"`
									} `json:"items"`
								} `json:"gridRenderer"`
							} `json:"contents"`
						} `json:"sectionListRenderer"`
					} `json:"content"`
				} `json:"tabRenderer"`
			} `json:"tabs"`
		} `json:"singleColumnBrowseResultsRenderer"`
	} `json:"contents"`
}

type ytTwoRowItem struct {
	Title              *ytRuns              `json:"title"`
	Subtitle           *ytRuns              `json:"subtitle"`
	ThumbnailRenderer  *ytThumbnailRenderer `json:"thumbnailRenderer"`
	NavigationEndpoint *struct {
		BrowseEndpoint *ytBrowseEndpoint `json:"browseEndpoint"`
	} `json:"navigationEndpoint"`
}

type ytTwoRowItems []struct {
	MusicTwoRowItemRenderer *ytTwoRowItem `json:"musicTwoRowItemRenderer"`
}

type ytCategoryResponse struct {
	Header *struct {
		MusicHeaderRenderer *struct {
			Title *ytRuns `json:"title"`
		} `json:"musicHeaderRenderer"`
	} `json:"header"`
	Contents *struct {
		SingleColumnBrowseResultsRenderer *struct {
			Tabs []struct {
				TabRenderer *struct {
					Content *struct {
						SectionListRenderer *struct {
							Contents []struct {
								MusicCarouselShelfRenderer *struct {
									Contents ytTwoRowItems `json:"contents"`
								} `json:"musicCarouselShelfRenderer"`
								GridRenderer *struct {
									Items ytTwoRowItems `json:"items"`
								} `json:"gridRenderer"`
							} `json:"contents"`
						} `json:"sectionListRenderer"`
					} `json:"content"`
				} `json:"tabRenderer"`
			} `json:"tabs"`
		} `json:"singleColumnBrowseResultsRenderer"`
	} `json:"contents"`
}

type ytPlaylistResponse struct {
	Contents *struct {
		TwoColumnBrowseResultsRenderer *struct {
			Tabs []struct {
				TabRenderer *struct {
					Content *struct {
						SectionListRenderer *struct {
							Contents []struct {
								MusicResponsiveHeaderRenderer *struct {
									Title     *ytRuns              `json:"title"`
									Thumbnail *ytThumbnailRenderer `json:"thumbnail"`
								} `json:"musicResponsiveHeaderRenderer"`
							} `json:"contents"`
						} `json:"sectionListRenderer"`
					} `json:"content"`
				} `json:"tabRenderer"`
			} `json:"tabs"`
			SecondaryContents *struct {
				SectionListRenderer *struct {
					Contents []struct {
						MusicPlaylistShelfRenderer *struct {
							Contents []struct {
								MusicResponsiveListItemRenderer *ytMusicListItem `json:"musicResponsiveListItemRenderer"`
							} `json:"contents"`
						} `json:"musicPlaylistShelfRenderer"`
					} `json:"contents"`
				} `json:"sectionListRenderer"`
			} `json:"secondaryContents"`
		} `json:"twoColumnBrowseResultsRenderer"`
	} `json:"contents"`
}

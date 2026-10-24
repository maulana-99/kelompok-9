package model

// Page adalah amplop respons paginated untuk endpoint berbasis database
// (users, followers, following) — total diketahui dari COUNT di SQL.
type Page[T any] struct {
	Items      []T   `json:"items"`
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
	HasMore    bool  `json:"has_more"`
}

// NewPage membangun Page dari hasil query satu halaman.
func NewPage[T any](items []T, page, limit int, total int64) Page[T] {
	totalPages := 0
	if limit > 0 {
		totalPages = int((total + int64(limit) - 1) / int64(limit))
	}
	if items == nil {
		items = []T{}
	}
	return Page[T]{
		Items:      items,
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
		HasMore:    page < totalPages,
	}
}

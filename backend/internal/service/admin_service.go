package service

import (
	"backend/internal/model"
	"backend/internal/repository"
	"strings"
	"unicode/utf8"
)

const (
	DefaultAdminPageSize = 20
	MaxAdminPageSize     = 100
	maxAdminQueryLen     = 100
	// Keeps (page-1)*limit far from int overflow; nobody pages this far.
	maxAdminPage = 1_000_000
)

// AdminService is read-only: admins can look at registered users, not change them.
type AdminService interface {
	ListUsers(query string, page, limit int) (*model.AdminUserList, error)
	Stats() (model.AdminStats, error)
}

type adminService struct {
	repo repository.AdminRepository
}

func NewAdminService(repo repository.AdminRepository) AdminService {
	return &adminService{repo: repo}
}

// normalizeAdminPage clamps paging input to sane bounds and trims the search text.
func normalizeAdminPage(query string, page, limit int) (string, int, int) {
	// Postgres rejects NUL and invalid UTF-8 in text: drop them instead of a 500.
	query = strings.TrimSpace(strings.ToValidUTF8(strings.ReplaceAll(query, "\x00", ""), ""))
	if utf8.RuneCountInString(query) > maxAdminQueryLen {
		query = string([]rune(query)[:maxAdminQueryLen])
	}
	if page < 1 {
		page = 1
	}
	if page > maxAdminPage {
		page = maxAdminPage
	}
	if limit < 1 {
		limit = DefaultAdminPageSize
	}
	if limit > MaxAdminPageSize {
		limit = MaxAdminPageSize
	}
	return query, page, limit
}

func (s *adminService) ListUsers(query string, page, limit int) (*model.AdminUserList, error) {
	query, page, limit = normalizeAdminPage(query, page, limit)
	users, total, err := s.repo.ListUsers(query, limit, (page-1)*limit)
	if err != nil {
		return nil, err
	}
	return &model.AdminUserList{Items: users, Total: total, Page: page, Limit: limit}, nil
}

func (s *adminService) Stats() (model.AdminStats, error) {
	return s.repo.Stats()
}

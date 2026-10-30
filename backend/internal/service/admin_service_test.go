package service

import (
	"encoding/json"
	"strings"
	"testing"

	"backend/internal/model"
)

func TestNormalizeAdminPage(t *testing.T) {
	q, page, limit := normalizeAdminPage("  alice  ", 0, 0)
	if q != "alice" || page != 1 || limit != DefaultAdminPageSize {
		t.Fatalf("defaults: got %q %d %d", q, page, limit)
	}
	if _, _, limit := normalizeAdminPage("", 2, 1000); limit != MaxAdminPageSize {
		t.Fatalf("limit not capped: %d", limit)
	}
	if q, _, _ := normalizeAdminPage(strings.Repeat("é", 300), 1, 10); len([]rune(q)) != maxAdminQueryLen {
		t.Fatalf("query not truncated by rune: %d", len([]rune(q)))
	}
	if q, _, _ := normalizeAdminPage("al\x00i\xffce", 1, 10); q != "alice" {
		t.Fatalf("NUL/invalid UTF-8 not stripped: %q", q)
	}
	if _, page, _ := normalizeAdminPage("", 1<<62, 100); page != maxAdminPage {
		t.Fatalf("page not capped: %d", page)
	}
}

// Role must never leak through the public User JSON, only through SessionUser.
func TestRoleOnlyInSessionUser(t *testing.T) {
	user := &model.User{ID: 1, Name: "A", Username: "a", Role: model.RoleAdmin}
	public, _ := json.Marshal(user)
	if strings.Contains(string(public), "role") {
		t.Fatalf("public user JSON leaks role: %s", public)
	}
	session, _ := json.Marshal(model.NewSessionUser(user))
	if !strings.Contains(string(session), `"role":"admin"`) || !strings.Contains(string(session), `"username":"a"`) {
		t.Fatalf("session JSON wrong: %s", session)
	}
}

// Package migrations menyimpan file SQL migration dan meng-embed-nya ke binary,
// supaya `go build` menghasilkan aplikasi yang bisa migrate tanpa file eksternal.
package migrations

import "embed"

//go:embed *.sql
var FS embed.FS

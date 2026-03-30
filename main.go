package main

import (
	"embed"
	_ "embed"
	"log"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/yasufad/vaneesa/internal/db"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed build/appicon.png
var appIcon []byte

func main() {
	database, err := openDatabase()
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}
	defer database.Close()

	app := application.New(application.Options{
		Name:        "vaneesa",
		Description: "Real-time network intelligence dashboard",
		Services:    []application.Service{},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	menu := createApplicationMenu(app)
	app.Menu.Set(menu)

	themeService := NewThemeService(app)
	app.RegisterService(application.NewService(themeService))
	app.RegisterService(application.NewService(NewSettingsService(database)))
	app.RegisterService(application.NewService(NewSessionService(database)))
	app.RegisterService(application.NewService(NewCaptureService(app, database)))

	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title: "Vaneesa",
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
		BackgroundColour:   application.NewRGB(27, 38, 54),
		URL:                "/",
		UseApplicationMenu: true,
	})

	// Emit the initial theme after the window is created so the frontend
	// receives it before any user interaction occurs.
	app.Event.Emit("theme:changed", themeService.GetTheme())

	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}

// openDatabase opens the Vaneesa database at the OS-appropriate path.
// The db package handles path resolution internally following the convention
// documented in ARCHITECTURE.md:
//   - Windows:  %APPDATA%\vaneesa\vaneesa.db
//   - macOS:    ~/Library/Application Support/vaneesa/vaneesa.db
//   - Linux:    ~/.local/share/vaneesa/vaneesa.db  (via XDG_DATA_HOME)
func openDatabase() (*db.DB, error) {
	return db.Open()
}

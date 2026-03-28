package main

import (
	"runtime"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// createApplicationMenu builds the native OS application menu for Vaneesa.
// Menus are platform-appropriate: global menu bar on macOS, per-window on Windows/Linux.
func createApplicationMenu(app *application.App) *application.Menu {
	menu := app.NewMenu()

	// macOS requires the AppMenu role for standard application menu items
	// (About, Preferences, Hide, Quit) - https://developer.apple.com/design/human-interface-guidelines/menus
	if runtime.GOOS == "darwin" {
		menu.AddRole(application.AppMenu)
	}

	// File menu - session management and export operations
	fileMenu := menu.AddSubmenu("File")

	newSessionItem := fileMenu.Add("New Live Session...")
	newSessionItem.SetAccelerator("CmdOrCtrl+N")
	newSessionItem.OnClick(func(ctx *application.Context) {
		app.Event.Emit("menu:new-session")
	})

	openPCAPItem := fileMenu.Add("Open PCAP File...")
	openPCAPItem.SetAccelerator("CmdOrCtrl+O")
	openPCAPItem.OnClick(func(ctx *application.Context) {
		app.Event.Emit("menu:open-pcap")
	})

	fileMenu.AddSeparator()

	exportMenu := fileMenu.AddSubmenu("Export Current Session")

	exportCSVItem := exportMenu.Add("Export Connections as CSV")
	exportCSVItem.OnClick(func(ctx *application.Context) {
		app.Event.Emit("menu:export-csv")
	})

	exportJSONItem := exportMenu.Add("Export Connections as JSON")
	exportJSONItem.OnClick(func(ctx *application.Context) {
		app.Event.Emit("menu:export-json")
	})

	exportPCAPItem := exportMenu.Add("Export PCAP (Planned)")
	exportPCAPItem.SetEnabled(false)

	fileMenu.AddSeparator()

	settingsItem := fileMenu.Add("Settings")
	settingsItem.SetAccelerator("CmdOrCtrl+,")
	settingsItem.OnClick(func(ctx *application.Context) {
		app.Event.Emit("menu:navigate", "settings")
	})

	fileMenu.AddSeparator()

	quitItem := fileMenu.Add("Quit")
	quitItem.SetAccelerator("CmdOrCtrl+Q")
	quitItem.OnClick(func(ctx *application.Context) {
		app.Quit()
	})

	// Edit menu - standard text editing operations
	menu.AddRole(application.EditMenu)

	// View menu - navigation between views and window controls
	viewMenu := menu.AddSubmenu("View")

	viewMenu.Add("Dashboard").SetAccelerator("CmdOrCtrl+1").OnClick(func(ctx *application.Context) {
		app.Event.Emit("menu:navigate", "dashboard")
	})

	viewMenu.Add("Connections").SetAccelerator("CmdOrCtrl+2").OnClick(func(ctx *application.Context) {
		app.Event.Emit("menu:navigate", "connections")
	})

	viewMenu.Add("Hosts").SetAccelerator("CmdOrCtrl+3").OnClick(func(ctx *application.Context) {
		app.Event.Emit("menu:navigate", "hosts")
	})

	viewMenu.Add("Protocols").SetAccelerator("CmdOrCtrl+4").OnClick(func(ctx *application.Context) {
		app.Event.Emit("menu:navigate", "protocols")
	})

	viewMenu.Add("Alerts").SetAccelerator("CmdOrCtrl+5").OnClick(func(ctx *application.Context) {
		app.Event.Emit("menu:navigate", "alerts")
	})

	viewMenu.Add("Sessions").SetAccelerator("CmdOrCtrl+6").OnClick(func(ctx *application.Context) {
		app.Event.Emit("menu:navigate", "sessions")
	})

	viewMenu.AddSeparator()

	viewMenu.Add("Zoom In").SetAccelerator("CmdOrCtrl++").OnClick(func(ctx *application.Context) {
		app.Event.Emit("menu:zoom", "in")
	})

	viewMenu.Add("Zoom Out").SetAccelerator("CmdOrCtrl+-").OnClick(func(ctx *application.Context) {
		app.Event.Emit("menu:zoom", "out")
	})

	viewMenu.AddSeparator()

	fullscreenItem := viewMenu.Add("Toggle Fullscreen")
	fullscreenItem.SetAccelerator("F11")
	if runtime.GOOS == "darwin" {
		fullscreenItem.SetAccelerator("CmdOrCtrl+F")
	}
	fullscreenItem.OnClick(func(ctx *application.Context) {
		app.Event.Emit("menu:toggle-fullscreen")
	})

	// Window menu - standard window management
	menu.AddRole(application.WindowMenu)

	// Help menu - documentation and about
	helpMenu := menu.AddSubmenu("Help")

	helpMenu.Add("Documentation / GitHub").OnClick(func(ctx *application.Context) {
		app.Browser.OpenURL("https://github.com/yasufad/vaneesa")
	})

	helpMenu.Add("Check for Updates").OnClick(func(ctx *application.Context) {
		app.Event.Emit("menu:check-updates")
	})

	helpMenu.AddSeparator()

	helpMenu.Add("About Vaneesa").OnClick(func(ctx *application.Context) {
		app.Event.Emit("menu:about")
	})

	return menu
}

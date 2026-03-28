# Menus Guide

A guide to creating and customising menus in Wails v3.

Wails v3 provides a powerful menu system that allows you to create both application menus and context menus.

## Creating a Menu

To create a new menu, use the `New()` method from the Menus manager:

```go
menu := app.Menu.New()
```

## Adding Menu Items

Wails supports several types of menu items:

### Regular Menu Items

Regular menu items are the basic building blocks of menus:

```go
menuItem := menu.Add("Click Me")
```

### Checkboxes

Checkbox menu items provide a toggleable state:

```go
checkbox := menu.AddCheckbox("My checkbox", true)  // true = initially checked
```

### Radio Groups

Radio groups allow users to select one option from a set of mutually exclusive choices:

```go
menu.AddRadio("Option 1", true)   // true = initially selected
menu.AddRadio("Option 2", false)
menu.AddRadio("Option 3", false)
```

### Separators

Separators are horizontal lines that help organise menu items into logical groups:

```go
menu.AddSeparator()
```

### Submenus

Submenus are nested menus that appear when hovering over or clicking a menu item:

```go
submenu := menu.AddSubmenu("File")
submenu.Add("Open")
submenu.Add("Save")
```

### Combining Menus

A menu can be added into another menu by appending or prepending it:

```go
menu := app.Menu.New()
menu.Add("First Menu")

secondaryMenu := app.Menu.New()
secondaryMenu.Add("Second Menu")

// insert 'secondaryMenu' after 'menu'
menu.Append(secondaryMenu)

// insert 'secondaryMenu' before 'menu'
menu.Prepend(secondaryMenu)

// update the menu
menu.Update()
```

**Note:** By default, `prepend` and `append` will share state with the original menu. If you want to create a new menu with its own state, you can call `.Clone()` on the menu: `menu.Append(secondaryMenu.Clone())`

### Clearing a Menu

In some cases it'll be better to construct a whole new menu if you are working with a variable amount of menu items:

```go
menu := app.Menu.New()
menu.Add("Waiting for update...")

// after certain logic, the menu has to be updated
menu.Clear()
menu.Add("Update complete!")
menu.Update()
```

**Note:** Clearing a menu simply clears the menu items at the top level. Whilst Submenus won't be visible, they will still occupy memory so be sure to manage your menus carefully.

### Destroying a Menu

If you want to clear and release a menu, use the `Destroy()` method:

```go
menu := app.Menu.New()
menu.Add("Waiting for update...")

// after certain logic, the menu has to be destroyed
menu.Destroy()
```

## Menu Item Properties

Menu items have several properties that can be configured:

| Property | Method | Description |
|----------|--------|-------------|
| Label | `SetLabel(string)` | Sets the display text |
| Enabled | `SetEnabled(bool)` | Enables/disables the item |
| Checked | `SetChecked(bool)` | Sets the checked state (for checkboxes/radio items) |
| Tooltip | `SetTooltip(string)` | Sets the tooltip text |
| Hidden | `SetHidden(bool)` | Shows/hides the item |
| Accelerator | `SetAccelerator(string)` | Sets the keyboard shortcut |

## Menu Item States

Menu items can be in different states that control their visibility and interactivity:

### Visibility

Menu items can be shown or hidden dynamically using the `SetHidden()` method:

```go
menuItem := menu.Add("Dynamic Item")

// Hide the menu item
menuItem.SetHidden(true)

// Show the menu item
menuItem.SetHidden(false)

// Check current visibility
isHidden := menuItem.Hidden()
```

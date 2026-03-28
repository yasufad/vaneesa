# Creating Custom Templates

Learn how to create and customise your own Wails v3 templates.

This guide will walk you through the process of creating a custom template for Wails v3.

## Why would I make a custom template?

Wails comes with a number of pre-configured templates that allow you to get your application up and running quickly. But if you need a more customised setup, you can create your own template to suit your needs. This can then be shared with the Wails community for others to use.

### 1. Generating a Template

To create a custom template, you can use the `wails generate template` command:

```bash
wails3 generate template -name mytemplate
```

This will create a new directory called "mytemplate" in your current directory.

The `wails3 generate template` command supports the following options:

| Option | Description | Default |
|--------|-------------|---------|
| `-name` | The name of your template (required) | - |
| `-frontend` | Path to an existing frontend directory to include | - |
| `-author` | The author of the template | - |
| `-description` | A description of the template | - |
| `-helpurl` | URL for template documentation | - |
| `-dir` | Directory to generate the template in | Current directory |
| `-version` | Template version | v0.0.1 |

For example, to create a template with all options:

```bash
wails3 generate template \
  -name "My Custom Template" \
  -frontend ./my-existing-frontend \
  -author "Your Name" \
  -description "A template with my preferred setup" \
  -helpurl "https://github.com/yourusername/template-docs" \
  -dir ./templates \
  -version "v1.0.0"
```

**Tip:** Using the `-frontend` option will copy an existing web frontend project into the template.

### 2. Configure Template Metadata

If you didn't specify the template configuration when generating the template, you can update the `template.json` file in the template directory:

```json5
{
  "name": "Your Template Name",          // Display name of your template
  "shortname": "template-shortname",     // Used when referencing your template
  "author": "Your Name",                 // Template author
  "description": "Template description", // Template description
  "helpurl": "https://your-docs.com",    // Documentation URL
  "version": "v0.0.1",                   // Template version
  "schema": 3                            // Must be kept as 3 for Wails v3
}
```

**Caution:** The `schema` field must remain set to `3` for compatibility with Wails v3.

### 3. Set Up Build Tasks

In the `build` directory is `Taskfile.yml` where you can define your template's build process. This file uses [Task](https://taskfile.dev) for build automation. The key steps are:

```yaml
tasks:
  install:frontend:deps:
    summary: Install frontend dependencies
    dir: frontend
    sources:
      - package.json
      - package-lock.json
    generates:
      - node_modules/*
    preconditions:
      - sh: npm version
        msg: "Looks like npm isn't installed."
    cmds:
      - npm install

  build:frontend:
    summary: Build the frontend project
    dir: frontend
    sources:
      - "**/*"
    generates:
      - dist/*
    deps:
      - task: install:frontend:deps
      - task: generate:bindings
    cmds:
      - npm run build -q
```

### 4. Frontend Setup

If you did not use `-frontend` when generating the template, you need to add frontend files to your template.

There are a number of ways to set up your frontend: starting from scratch or using an existing framework.

**Start from Scratch:**

If you want to start from scratch, you can create your frontend project just like you would for any web application. The `frontend` directory in your template is just a regular directory where you can set up your preferred development environment. You might want to use build tools like Vite, webpack, or even just plain HTML, CSS, and JavaScript - it's entirely up to you!

For example, if you're using Vite, you could navigate to the `frontend` directory and run:

```bash
npm create vite@latest .
```

Then follow the prompts to set up your project exactly how you want it.

**Use Existing Framework:**

For this example, we'll use [Vite](https://vitejs.dev/) to set up a React frontend project:

```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install
```

Now you have the frontend files in place, update `common/Taskfile.yml` with the appropriate commands.

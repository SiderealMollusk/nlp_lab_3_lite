# Data Submodule Setup

This project uses a **git submodule** for the `data/` directory to keep data versioned separately from code.

## Structure

- **Main repo**: `nlp_lab_3_lite` (code)
- **Data repo**: `nlp_lab_3_lite-data` (private, data only)

## Auto-Commit Hook

A post-commit hook automatically commits and pushes data changes after each main repo commit.

**Hook location**: `.git/hooks/post-commit`

**Behavior**:
- After you commit to main repo
- Hook checks for changes in `data/`
- If changes exist, commits them with message:
  ```
  Data from main commit: {hash} - {message}
  ```
- Pushes to data repo automatically

## Usage

### Normal workflow:
```bash
# Make changes to code and/or data
git add .
git commit -m "Your commit message"
# Hook automatically commits data if changed
```

### Clone this repo elsewhere:
```bash
git clone <main-repo-url>
cd nlp_lab_3_lite
git submodule init
git submodule update
```

### Update data submodule:
```bash
cd data
git pull origin main
cd ..
git add data
git commit -m "Update data submodule"
```

## Benefits

✅ Data versioned separately  
✅ Data repo can be private  
✅ Main repo stays clean  
✅ Auto-linked commits  
✅ Easy to track data provenance  

## Repos

- Main: https://github.com/SiderealMollusk/nlp_lab_3_lite
- Data: https://github.com/SiderealMollusk/nlp_lab_3_lite-data (private)

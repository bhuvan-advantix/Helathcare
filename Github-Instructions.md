# -----------------------------------------

# Bhuvan Instructions

# -----------------------------------------

1. Open Antgravity/Vscode
2. Make sure no files are open (empty workspace)
3. Click New Terminal
4. Run these commands:

Set-ExecutionPolicy Bypass -Scope Process

cd desktop

git clone https://github.com/CreatzionTraining/Sparkle-knowledge.git

just drag and drop the Sparkle-knowledge folder from Desktop into Antgravity — or click File → Open Folder and select it from Desktop.

git fetch origin    # Use this command only if any branch is not   showing or not fetched properly.If everything is already visible, you don’t need to run it — it’s optional.

git checkout Bhuvan

npm install

After this, you can start working on your branch. Please make sure the bottom-left corner shows your branch name as Bhuvan before you begin

Once you make any changes or complete any work, use the below commands to push your updates to your branch.

git add .
git commit -m "Your commit message here"
git push -u origin Bhuvan    ⚠️ Important: Do not push to the main branch by mistake — always push only to your own branch

# Use only with gatekeeper permission

⚠️ Use these commands only after getting gatekeeper permission. Do not use them without approval.

Before pulling from main, make sure you have pushed all your changes to your own branch. Only after that, you should run the pull command.

You do not need to switch to the main branch.
Stay on your own branch (Bhuvan) and pull the changes from main directly into your branch.

git pull origin main
npm install
npm run dev
git add .
git commit -m "Pull sucessfull from main - Today's Date Ex:14-01-2026"
git push -u origin Bhuvan ⚠️ Important: Do not push to the main branch by mistake — always push only to your own branch

# -----------------------------------------

# Gatekeeper Instructions

# -----------------------------------------

git checkout main
git merge Branch Name ( EX: main/Test/Devlopment )
npm install
git push origin main  # No Merge conflicts or added files A symbol we can use this command

# if we have merge conflicts we need to resolve them first and then push the changes to main branch

git add .
git commit -m "Your commit message here"
git push -u origin main

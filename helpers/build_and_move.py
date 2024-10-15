#!/usr/bin/env python3

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path


def loadConfig(configFile="config.json"):
    try:
        with open(configFile, "r") as f:
            config = json.load(f)
        return config
    except Exception as e:
        print(f"Error loading configuration file '{configFile}': {e}")
        sys.exit(1)


def runCompiler():
    try:
        # Run the TypeScript compiler
        print("Compiling TypeScript files...")
        subprocess.check_call(["npm", "run", "build"])
        print("Compilation completed successfully.")
    except subprocess.CalledProcessError as e:
        print(f"Compilation failed: {e}")
        sys.exit(1)


def renameOutputFile(compileOutputName, originalName, newName):
    originalPath = os.path.join(compileOutputName, originalName)
    newPath = os.path.join(compileOutputName, newName)
    if os.path.exists(originalPath):
        os.rename(originalPath, newPath)
        print(f"Renamed '{originalName}' to '{newName}'.")
    else:
        print(
            f"Error: Compiled output file '{originalName}' not found in '{compileOutputName}'."
        )
        sys.exit(1)


def moveGeneratedFiles(sourceDir, destinationDir):
    if not os.path.exists(sourceDir):
        print(f"Source directory '{sourceDir}' does not exist.")
        sys.exit(1)

    if not os.path.exists(destinationDir):
        os.makedirs(destinationDir)
        print(f"Created destination directory '{destinationDir}'.")

    # Copy all files and directories from source to destination
    for item in os.listdir(sourceDir):
        srcItem = os.path.join(sourceDir, item)
        destItem = os.path.join(destinationDir, item)

        if os.path.isdir(srcItem):
            shutil.copytree(srcItem, destItem, dirs_exist_ok=True)
        else:
            shutil.copy2(srcItem, destItem)

    print(f"Moved compiled files from '{sourceDir}' to '{destinationDir}'.")


def attachNodeModules(destinationDir):
    nodeModulesSrc = os.path.join(os.getcwd(), "node_modules")
    nodeModulesDest = os.path.join(destinationDir, "node_modules")

    if not os.path.exists(nodeModulesSrc):
        print(
            "Error: 'node_modules' directory does not exist in the current working directory."
        )
        sys.exit(1)

    if os.path.exists(nodeModulesDest):
        print(f"'node_modules' already exists in '{destinationDir}'.")
    else:
        os.symlink(nodeModulesSrc, nodeModulesDest)
        print(f"Created symbolic link for 'node_modules' in '{destinationDir}'.")


def displayAddedRouters():
    # Placeholder function to display added routers
    # Implement this function based on your application's logic
    print("Displaying added routers:")
    # Example: Read routes from a file or configuration
    try:
        with open("routes.json", "r") as f:
            routes = json.load(f)
        for route in routes.get("routers", []):
            print(f"- {route}")
    except FileNotFoundError:
        print("No routers found. 'routes.json' does not exist.")
    except json.JSONDecodeError as e:
        print(f"Error parsing 'routes.json': {e}")


def interactiveCli():
    while True:
        print("\nInteractive CLI:")
        print("1. Display added routers")
        print("2. Exit")
        choice = input("Enter your choice (1-2): ")

        if choice == "1":
            displayAddedRouters()
        elif choice == "2":
            print("Exiting.")
            break
        else:
            print("Invalid choice. Please try again.")


def main():
    # Load configuration
    config = loadConfig()

    destination = config.get("destination", "./deploy")
    compileOutputName = config.get("compileOutputName", "dist")
    nodeModuleAttach = config.get("nodeModuleAttach", False)
    outputFileName = config.get("outputFileName", "index.js")

    entryPoint = config.get("entryPoint", "index.ts")

    # Run compiler
    runCompiler()

    # Rename output file if needed
    if outputFileName != "index.js":
        renameOutputFile(compileOutputName, "index.js", outputFileName)

    # Move compiled files to destination
    moveGeneratedFiles(compileOutputName, destination)

    # Attach node_modules if specified
    if nodeModuleAttach:
        attachNodeModules(destination)

    # Start interactive CLI
    interactiveCli()


if __name__ == "__main__":
    main()

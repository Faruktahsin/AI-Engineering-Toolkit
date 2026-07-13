import os
import shutil

FILE_TYPES = {
    "Images": [".jpg", ".jpeg", ".png", ".gif", ".webp"],
    "Documents": [".pdf", ".doc", ".docx", ".txt"],
    "Spreadsheets": [".xls", ".xlsx", ".csv"],
    "Archives": [".zip", ".rar", ".7z"],
    "Videos": [".mp4", ".mov", ".mkv"],
    "Music": [".mp3", ".wav"]
}

def organize(folder):
    if not os.path.exists(folder):
        print("Folder not found.")
        return

    for file in os.listdir(folder):
        path = os.path.join(folder, file)

        if os.path.isdir(path):
            continue

        extension = os.path.splitext(file)[1].lower()

        for category, extensions in FILE_TYPES.items():
            if extension in extensions:
                destination = os.path.join(folder, category)
                os.makedirs(destination, exist_ok=True)
                shutil.move(path, os.path.join(destination, file))
                break

    print("Organization completed successfully.")

if __name__ == "__main__":
    target = input("Folder path: ")
    organize(target)

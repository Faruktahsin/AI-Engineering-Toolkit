import os

def list_files(directory):
    print(f"\nFiles in: {directory}\n")

    for filename in os.listdir(directory):
        print(filename)

if __name__ == "__main__":
    folder = input("Enter folder path: ")
    list_files(folder)

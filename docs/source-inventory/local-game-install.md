# NMRiH2 Local Steam Installation Source Inventory

## 1. Installation Profile
* **Host OS**: Windows 11 / WSL2 Ubuntu Linux
* **Steam Library Path**: `/mnt/d/SteamLibrary/steamapps/common/nmrih2`
* **Steam AppManifest**: `/mnt/d/SteamLibrary/steamapps/appmanifest_292000.acf`
* **App ID**: `292000`
* **Build ID**: `24830003`
* **Last Updated Timestamp**: `1787714674` (August 25, 2026 20:22 UTC - Corresponds to shipping Hotfix 1.0.4.0)
* **Total Size on Disk**: 25,167,119,216 bytes (~25.1 GB)

## 2. Directory Structure & Container Summary
* **Game Executable**: `NMRiH2/Binaries/Win64/NMRiH2-Win64-Shipping.exe` (184,200,704 bytes, updated Aug 25 20:22)
* **Launcher Executable**: `NMRiH2.exe` (3,975,920 bytes)
* **Engine Framework**: Unreal Engine 5 (UE5)
* **Content Container**: `NMRiH2/Content/Paks/` utilizing IoStore Container archives (`.utoc`, `.ucas`, `.pak` chunk pairs).
* **Local User Configurations**: `/mnt/c/Users/Anthony_Ma/AppData/Local/NMRiH2/Saved/Config/Windows/`
  * `Engine.ini`
  * `GameUserSettings.ini`

## 3. Extraction Tooling Status & Permission Note
* The shipping game files store cooked game assets in UE5 IoStore containers (`pakchunk*-Windows.ucas` / `utoc`).
* No third-party unpacker is bundled with the game installation. Per Section 0.2 & 3.2, no unverified third-party binaries or tools are executed without user permission.
* Verified game values are cross-checked directly with the primary datamined compendium snapshot (1.0.4.0) and official developer patch notes.

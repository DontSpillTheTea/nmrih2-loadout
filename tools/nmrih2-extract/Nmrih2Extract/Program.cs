using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using CUE4Parse.FileProvider;
using CUE4Parse.UE4.Versions;
using Newtonsoft.Json;

namespace Nmrih2Extract
{
    class Program
    {
        static void Main(string[] args)
        {
            string paksDir = "/mnt/d/SteamLibrary/steamapps/common/nmrih2/NMRiH2/Content/Paks";
            var dirInfo = new DirectoryInfo(paksDir);
            var provider = new DefaultFileProvider(dirInfo, SearchOption.AllDirectories, new VersionContainer(EGame.GAME_UE5_3));
            provider.Initialize();
            provider.Mount();

            string outDir = "/home/anthony_m/git/nmrih2-loadout/data/raw/local-game/extracted";
            Directory.CreateDirectory(outDir);

            if (provider.GlobalData?.GlobalNameMap != null)
            {
                var allNames = provider.GlobalData.GlobalNameMap.Select(n => n.Name).Distinct().OrderBy(n => n).ToList();
                File.WriteAllText(Path.Combine(outDir, "global-names.json"), JsonConvert.SerializeObject(allNames, Formatting.Indented));
                Console.WriteLine($"Saved {allNames.Count} global names to global-names.json");

                string[] searchKeywords = new[]
                {
                    "stamina", "stability", "damage", "health", "armor", "armour", "helmet", "penetration",
                    "hitman", "cleaver", "knife", "tireiron", "pipe", "hammer", "axe", "bat", "perk", "skill",
                    "knockdown", "stagger", "interrupt", "downed", "flinch", "montage", "notify", "trace"
                };

                var matchedNames = allNames.Where(n => searchKeywords.Any(k => n.IndexOf(k, StringComparison.OrdinalIgnoreCase) >= 0)).ToList();
                File.WriteAllText(Path.Combine(outDir, "combat-global-names.json"), JsonConvert.SerializeObject(matchedNames, Formatting.Indented));
                Console.WriteLine($"Saved {matchedNames.Count} combat-matched global names to combat-global-names.json");

                Console.WriteLine("\nSample Combat Global Names:");
                foreach (var n in matchedNames.Take(40))
                {
                    Console.WriteLine($"  {n}");
                }
            }
        }
    }
}

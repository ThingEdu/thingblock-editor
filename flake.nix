{
  description = "thingblock-editor dev environment";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
    in {
      devShells.${system}.default = pkgs.mkShell {
        packages = with pkgs; [
          nodejs_22
          pnpm        # or yarn, or remove it
          git
        ];

        shellHook = ''
          echo "nix environment"
          echo "thingblock-editor dev shell: node $(node --version)"
        '';
      };
    };
}
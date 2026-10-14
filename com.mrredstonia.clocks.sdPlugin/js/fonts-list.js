// Well-known font family names. The inspector probes each one against the
// system and only offers the ones that are actually installed.
window.KNOWN_FONTS = [
  // Common Linux system fonts
  "DejaVu Sans", "DejaVu Sans Mono", "DejaVu Serif", "DejaVu Sans Condensed", "DejaVu Serif Condensed",
  "Liberation Sans", "Liberation Sans Narrow", "Liberation Serif", "Liberation Mono",
  "Noto Sans", "Noto Serif", "Noto Sans Mono", "Noto Mono", "Noto Sans Display", "Noto Serif Display",
  "Noto Sans CJK JP", "Noto Sans CJK SC", "Noto Sans CJK KR", "Noto Serif CJK JP", "Noto Sans Symbols",
  "Noto Sans Arabic", "Noto Sans Hebrew", "Noto Sans Thai", "Noto Sans Devanagari", "Noto Color Emoji", "Noto Emoji",
  "Ubuntu", "Ubuntu Mono", "Ubuntu Condensed", "Ubuntu Sans", "Ubuntu Sans Mono",
  "Cantarell", "Adwaita Sans", "Adwaita Mono", "Oxygen", "Oxygen Mono",
  "Droid Sans", "Droid Sans Mono", "Droid Serif", "Droid Sans Fallback",
  "FreeSans", "FreeSerif", "FreeMono",
  "Nimbus Sans", "Nimbus Sans Narrow", "Nimbus Roman", "Nimbus Mono PS", "URW Gothic", "URW Bookman",
  "C059", "P052", "Z003",
  "Bitstream Vera Sans", "Bitstream Vera Sans Mono", "Bitstream Vera Serif",
  "Terminus", "Unifont", "Cousine", "Arimo", "Tinos", "Carlito", "Caladea", "Gelasio",
  "WenQuanYi Micro Hei", "WenQuanYi Zen Hei", "Source Han Sans", "Source Han Serif",
  "Lohit Devanagari", "Lohit Tamil", "Padauk", "Khmer OS",

  // Popular sans / display (Google Fonts and similar)
  "Open Sans", "Open Sans Condensed", "Roboto", "Roboto Condensed", "Roboto Slab", "Roboto Mono", "Roboto Flex",
  "Inter", "Inter Tight", "Inter Display", "Lato", "Montserrat", "Montserrat Alternates", "Poppins", "Raleway",
  "Nunito", "Nunito Sans", "Oswald", "PT Sans", "Source Sans Pro", "Source Sans 3", "Fira Sans", "Fira Sans Condensed",
  "Work Sans", "Rubik", "Karla", "Quicksand", "Barlow", "Barlow Condensed", "Manrope", "DM Sans", "Mulish",
  "Titillium Web", "Josefin Sans", "Libre Franklin", "Cabin", "Bebas Neue", "Anton", "Archivo", "Archivo Narrow",
  "Exo 2", "Orbitron", "Audiowide", "Righteous", "Comfortaa", "Fredoka", "Baloo 2", "Bangers",
  "Overpass", "Hind", "Heebo", "Assistant", "Lexend", "Outfit", "Sora", "Plus Jakarta Sans",
  "Red Hat Display", "Red Hat Text", "Atkinson Hyperlegible", "Space Grotesk", "Geist", "Staatliches",
  "Fjalla One", "Pathway Gothic One", "Yanone Kaffeesatz", "Teko", "Rajdhani", "Saira", "Chakra Petch",
  "Kanit", "Prompt", "Sarabun", "Mitr", "Tajawal", "Cairo", "Almarai", "Comic Neue", "Cooper Hewitt",
  "Zen Kaku Gothic New", "M PLUS 1p", "M PLUS Rounded 1c", "Kosugi", "Nanum Gothic",
  "Bungee", "Bungee Inline", "Monoton", "Faster One", "Black Ops One", "Squada One", "Rubik Mono One",
  "Pacifico", "Lobster", "Dancing Script", "Caveat", "Shadows Into Light", "Permanent Marker", "Indie Flower",
  "Special Elite", "Press Start 2P",

  // Serif
  "Merriweather", "Merriweather Sans", "Playfair Display", "PT Serif", "Source Serif Pro", "Source Serif 4",
  "Libre Baskerville", "Arvo", "DM Serif Display", "Spectral", "Crimson Text", "Crimson Pro", "EB Garamond",
  "Cormorant", "Cormorant Garamond", "Lora", "Bitter", "Zilla Slab", "Alegreya", "Alegreya Sans", "Domine",
  "Vollkorn", "Cardo", "Old Standard TT", "Abril Fatface", "Alfa Slab One", "Bevan", "IBM Plex Serif",
  "Gentium Plus", "Gentium Book Plus", "Charis SIL", "Doulos SIL", "Nanum Myeongjo", "Amiri", "Scheherazade New",

  // Monospace / programming
  "Source Code Pro", "Fira Mono", "Fira Code", "PT Mono", "IBM Plex Mono", "IBM Plex Sans", "Inconsolata",
  "Anonymous Pro", "Space Mono", "Share Tech Mono", "VT323", "DM Mono", "Overpass Mono", "Red Hat Mono",
  "Cascadia Code", "Cascadia Mono", "JetBrains Mono", "Hack", "Iosevka", "Iosevka Term", "Victor Mono",
  "Monoid", "Mononoki", "Geist Mono", "Commit Mono", "Maple Mono", "Recursive", "Lilex", "Monaspace Neon",
  "Operator Mono", "Input Mono", "Berkeley Mono", "Fantasque Sans Mono", "Comic Mono", "Courier Prime",
  "Courier 10 Pitch", "Cutive Mono", "Major Mono Display", "Syne Mono", "Nova Mono", "D2Coding",
  "Nanum Gothic Coding", "Meslo LG S", "Menlo", "Monaco", "SF Mono", "Consolas", "Lucida Console",

  // Nerd Fonts / icon fonts
  "JetBrainsMono Nerd Font", "JetBrainsMono NF", "FiraCode Nerd Font", "Fira Code Nerd Font", "Hack Nerd Font",
  "Ubuntu Nerd Font", "UbuntuMono Nerd Font", "DejaVuSansMono Nerd Font", "MesloLGS NF", "MesloLGS Nerd Font",
  "SauceCodePro Nerd Font", "CaskaydiaCove Nerd Font", "Symbols Nerd Font", "Symbols Nerd Font Mono",
  "Font Awesome 6 Free", "Font Awesome 5 Free", "Material Icons", "Material Symbols Outlined", "Powerline Symbols",

  // TeX / academic
  "Linux Libertine", "Linux Libertine O", "Linux Biolinum", "Libertinus Serif", "Libertinus Sans", "Libertinus Mono",
  "Latin Modern Roman", "Latin Modern Mono", "Latin Modern Sans", "STIX Two Text", "STIX Two Math",
  "TeX Gyre Heros", "TeX Gyre Termes", "TeX Gyre Pagella", "TeX Gyre Bonum", "TeX Gyre Schola",
  "TeX Gyre Cursor", "TeX Gyre Adventor", "Computer Modern", "CMU Serif", "CMU Sans Serif", "CMU Typewriter Text",

  // Microsoft / Apple (if you have them installed)
  "Arial", "Arial Black", "Arial Narrow", "Arial Rounded MT Bold", "Verdana", "Tahoma", "Trebuchet MS", "Georgia",
  "Times New Roman", "Times", "Courier New", "Courier", "Impact", "Comic Sans MS", "Palatino Linotype", "Palatino",
  "Book Antiqua", "Garamond", "Century Gothic", "Franklin Gothic Medium", "Segoe UI", "Segoe UI Emoji",
  "Calibri", "Cambria", "Candara", "Constantia", "Corbel", "Bahnschrift", "Sitka Text", "Ebrima", "Gabriola",
  "Lucida Grande", "Lucida Sans", "Gill Sans", "Futura", "Helvetica", "Helvetica Neue", "Avenir", "Avenir Next",
  "American Typewriter", "Optima", "Didot", "Baskerville", "Hoefler Text", "Papyrus", "Brush Script MT",
  "Copperplate", "Rockwell", "SF Pro Display", "SF Pro Text", "San Francisco", "Apple Color Emoji",
  "MS Gothic", "MS UI Gothic", "Meiryo", "Yu Gothic", "Malgun Gothic", "SimSun", "SimHei",
  "Microsoft YaHei", "Microsoft JhengHei", "PingFang SC", "Hiragino Sans",

  // Emoji
  "Twemoji Mozilla", "EmojiOne Color",
];

import noRules from "@/assets/product-no-rules.jpg";
import lost from "@/assets/product-lost.jpg";
import voidImg from "@/assets/product-void.jpg";
import rising from "@/assets/product-rising.jpg";
import silence from "@/assets/product-silence.jpg";
import ronin from "@/assets/product-ronin.jpg";
import echo from "@/assets/product-echo.jpg";

export type Product = {
  slug: string;
  name: string;
  label: string;
  price: string;
  image: string;
  story: string;
  tags: string[];
};

export const products: Product[] = [
  {
    slug: "no-rules",
    name: "NO RULES",
    label: "Limited Piece — 50 made",
    price: "€89",
    image: noRules,
    story:
      "A flag for the ones who never asked for permission. Stitched in defiance, hung in silence. NO RULES is the loudest thing you'll ever own without saying a word.",
    tags: ["Limited", "Drop 001", "Fabric Flag"],
  },
  {
    slug: "lost",
    name: "LOST",
    label: "Limited Piece — 40 made",
    price: "€89",
    image: lost,
    story:
      "Not a confession. A coordinate. For the ones who walked off the map and built a life in the margins.",
    tags: ["Limited", "Drop 001", "Fabric Flag"],
  },
  {
    slug: "void",
    name: "VOID",
    label: "Limited Piece — 30 made",
    price: "€99",
    image: voidImg,
    story:
      "The empty space between intention and act. VOID is the only honest color — everything else is a story we tell ourselves.",
    tags: ["Limited", "Drop 001", "Fabric Flag"],
  },
  {
    slug: "rising",
    name: "RISING",
    label: "Limited Piece — 35 made",
    price: "€95",
    image: rising,
    story:
      "Borrowed from a sun that never apologized for burning. Hung as a reminder: light is a discipline, not a gift.",
    tags: ["Limited", "Drop 001", "Fabric Flag"],
  },
  {
    slug: "silence",
    name: "SILENCE",
    label: "Limited Piece — 45 made",
    price: "€89",
    image: silence,
    story:
      "Loud rooms made you small. SILENCE makes you whole. The flag for everyone tired of being asked to explain themselves.",
    tags: ["Limited", "Drop 001", "Fabric Flag"],
  },
  {
    slug: "ronin",
    name: "RONIN",
    label: "Limited Piece — 25 made",
    price: "€109",
    image: ronin,
    story:
      "No master. No banner. Just a code. RONIN is for the disciplined outsiders — the ones who carry the rules inside.",
    tags: ["Limited", "Drop 001", "Fabric Flag"],
  },
  {
    slug: "echo",
    name: "ECHO",
    label: "Limited Piece — 40 made",
    price: "€89",
    image: echo,
    story:
      "Everything you said still bouncing off concrete. ECHO is the proof you were here, even after the city forgot.",
    tags: ["Limited", "Drop 001", "Fabric Flag"],
  },
];

export const getProduct = (slug: string) => products.find((p) => p.slug === slug);

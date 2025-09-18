function withValidProperties(
  properties: Record<string, undefined | string | string[]>,
) {
  return Object.fromEntries(
    Object.entries(properties).filter(([key, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return !!value;
    }),
  );
}

export async function GET() {
  const URL = process.env.NEXT_PUBLIC_URL || "https://movopayment.vercel.app";

  return Response.json({
    accountAssociation: {
      header: "eyJmaWQiOjkyODc1NiwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweDMzRmZlYjlmYmI5NjBERDZDNzBGYTlhYjljMjU0NjhFZkM1M2YwMzcifQ",
      payload: "eyJkb21haW4iOiJtb3ZvcGF5bWVudC52ZXJjZWwuYXBwIn0",
      signature: "MHgxNmE2NWExMzY2OTVlYmRlMjg3MWZlNTk3NmZlZjYxODg5MGI2MTU1NDNiYzMyOTU2NTcwNjg0NDljOWIwYzFkMDhmN2FkZmM3ODFkMDZkZjlmNjEwZGIyZTEzZjZmNTI4NTE2MDAxMzRmNGMxZTA3MDE3NWEyODRiNmJlZTU1ZjFj"
    },
    frame: withValidProperties({
      name: "Movo",
      version: "1",
      iconUrl: `${URL}/icon.png`,
      homeUrl: URL,
      imageUrl: `${URL}/image.png`,
      buttonTitle: "Open Movo Mini App",
      splashImageUrl: `${URL}/splash.png`,
      splashBackgroundColor: "#0a0a0a",
      webhookUrl: `${URL}/api/webhook`,
      screenshotUrls: [
        "https://res.cloudinary.com/ddzibjaqg/image/upload/v1756888292/Screenshot_2025-09-03_at_15.31.19_hbzwn9.png"
      ],
      heroImageUrl: `${URL}/hero.png`,
      description: "Send crypto seamlessly across multiple blockchains. Send tokens to anyone, anywhere, and let them convert to fiat instantly",
      subtitle: "The first multi chain cross border payment",
      primaryCategory: "finance",
      tags: [
        "finance",
        "payment",
        "defi",
        "fiat",
        "idrx"
      ],
      tagline: "Cross border payment",
      ogTitle: "MovoPayment",
      ogDescription: "Just Movo it",
      ogImageUrl: "https://res.cloudinary.com/ddzibjaqg/image/upload/v1756888757/IMG_3236_poczsu.png",
      castShareUrl: "https://farcaster.xyz/lexirieru.eth/0x1755fdb4"
    }),
  });
}

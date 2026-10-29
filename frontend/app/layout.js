import "./globals.css";

export const metadata = {
  title: "FusionAI — Family Activity Recommender",
  description:
    "Find movies, restaurants, and activities that every generation in your family will love. Powered by Qloo's cultural taste graph.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}

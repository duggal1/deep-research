
export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sheriff">
        {children}
      </body>
    </html>
  );
}
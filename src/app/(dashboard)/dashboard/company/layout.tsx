export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="-m-4 h-[calc(100%+3rem)] min-h-0 flex flex-col lg:-m-6">{children}</div>;
}

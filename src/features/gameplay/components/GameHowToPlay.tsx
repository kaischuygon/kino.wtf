interface GameHowToPlayProps {
  items: string[];
}

export default function GameHowToPlay({ items }: GameHowToPlayProps) {
  return (
    <>
      <h3 className="font-bold text-lg">How to play</h3>
      <ul className="list-disc ml-8">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </>
  );
}

const PHRASES = [
  'Britpop, reissued', 'Made for the last bus home', 'Est. 1994, Manchester', 'Free UK delivery over £75',
  'Only ever the nineties', 'Parkas · Platforms · Puffas', 'Definitely. Maybe.', 'Cut for now',
]
export default function Ticker() {
  const list = [...PHRASES, ...PHRASES]
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker__track">{list.map((p, i) => <span key={i}>{p}</span>)}</div>
    </div>
  )
}

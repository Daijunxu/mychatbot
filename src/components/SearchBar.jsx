function SearchBar({ value, onChange }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="搜索对话..."
      className="w-full p-2 bg-gray-800 text-white rounded"
    />
  );
}

export default SearchBar; 
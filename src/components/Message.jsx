function Message({ role, content }) {
  return (
    <div className={`flex mb-4 ${role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
      <div className={`
        max-w-[70%] p-3 rounded-lg
        ${role === 'assistant' ? 'bg-gray-200' : 'bg-blue-500 text-white'}
      `}>
        {content}
      </div>
    </div>
  );
}

export default Message; 
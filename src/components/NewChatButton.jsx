function NewChatButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="fixed top-4 left-4 z-10 p-2 bg-gray-900 text-white rounded-full hover:bg-gray-700"
    >
      +
    </button>
  );
}

export default NewChatButton; 
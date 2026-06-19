'use client';

const Modal = ({ isOpen, onClose, title, children, size = 'medium' }) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const sizeClass = {
    small: 'max-w-lg',
    medium: 'max-w-2xl',
    large: 'max-w-4xl',
  }[size] || 'max-w-2xl';

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-5 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className={`bg-white rounded-xl shadow-2xl w-full ${sizeClass} max-h-[90vh] overflow-y-auto relative`}>
        <div className="flex justify-between items-center px-7 py-6 border-b-2 border-gray-200 sticky top-0 bg-white z-10 rounded-t-xl">
          <h2 className="m-0 text-gray-800 text-2xl font-semibold">{title}</h2>
          <button
            className="bg-transparent border-none text-3xl text-gray-400 cursor-pointer p-0 w-9 h-9 flex items-center justify-center rounded-full transition-all hover:bg-gray-100 hover:text-gray-800"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="p-7">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;

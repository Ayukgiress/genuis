import React from 'react';

export const Footer = () => {
  return (
    <footer className="mt-16 py-8 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 bg-zinc-800 rounded flex items-center justify-center">
           <svg viewBox="0 0 24 24" className="w-3 h-3 text-zinc-400" fill="currentColor">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
            </svg>
        </div>
        <span>© 2023 Smart Career Assistant AI. All rights reserved.</span>
      </div>
      <div className="flex items-center gap-8">
        <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
        <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
        <a href="#" className="hover:text-white transition-colors">Contact Support</a>
      </div>
    </footer>
  );
};

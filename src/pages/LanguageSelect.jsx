import { motion } from 'framer-motion';

export default function LanguageSelect({ onSelect }) {
  return (
    <div className="fullscreen-page">
      <motion.div
        className="lang-select"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <motion.div
          className="lang-select__logo"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
        >
          إ
        </motion.div>

        <motion.h1
          className="lang-select__title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          إدارة
        </motion.h1>

        <motion.p
          className="lang-select__subtitle"
          style={{ fontFamily: "'Inter', 'Cairo', sans-serif" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Android Manager
        </motion.p>

        <motion.div
          className="lang-select__options"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <motion.div
            className="lang-select__option"
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect('en')}
          >
            <span className="lang-select__option-flag">🇺🇸</span>
            <span className="lang-select__option-text">English</span>
            <span className="lang-select__option-sub">Continue in English</span>
          </motion.div>

          <motion.div
            className="lang-select__option"
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect('ar')}
          >
            <span className="lang-select__option-flag">🇸🇦</span>
            <span className="lang-select__option-text" style={{ fontFamily: "'Cairo', sans-serif" }}>
              العربية
            </span>
            <span className="lang-select__option-sub" style={{ fontFamily: "'Cairo', sans-serif" }}>
              المتابعة بالعربية
            </span>
          </motion.div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          style={{
            marginTop: 40,
            fontSize: 12,
            color: 'var(--text-dim)',
          }}
        >
          v1.0.0 — Made with ❤️
        </motion.p>
      </motion.div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { getThemeClasses, getThemeIcons } from "../utils/themeUtils";

type MenuItem = {
  label: string;
  icon?: string;
  path?: string;
  children?: MenuItem[];
};
type SidebarProps = {
  items: MenuItem[];
  collapsed?: boolean;
};

type MenuItemProps = {
  item: MenuItem;
  depth?: number;
  collapsed?: boolean;
};

function MenuItemComponent(props: MenuItemProps) {
  const { item, depth = 0, collapsed = false } = props;
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { currentTheme } = useTheme();
  const themeClasses = getThemeClasses(currentTheme);
  const themeIcons = getThemeIcons(currentTheme);

  const hasChildren = item.children && item.children.length > 0;

  const handleClick = () => {
    if (collapsed && depth === 0) {
      // In collapsed mode, top-level items with children don't expand
      if (!hasChildren && item.path) {
        navigate(item.path);
      }
      return;
    }

    if (hasChildren) {
      setOpen(!open);
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const getItemStyles = () => {
    // const baseColor = currentTheme.name === 'universe' ? 'indigo' : 'green';
    // const secondaryColor = currentTheme.name === 'universe' ? 'purple' : 'emerald';

    if (collapsed && depth === 0) {
      return `bg-gradient-to-r ${currentTheme.colors.gradients.background} text-white font-bold text-sm shadow-lg border-l-4 border-white/30 justify-center`;
    }
    if (depth === 0) {
      return `bg-gradient-to-r ${currentTheme.colors.gradients.primary} text-white font-bold text-lg shadow-lg border-l-4 border-white/30`;
    } else if (depth === 1) {
      return `bg-gradient-to-r ${currentTheme.colors.gradients.background} ${themeClasses.primaryText} font-semibold ml-4 border-l-2 border-white/20`;
    } else {
      return `bg-white/80 ${themeClasses.primaryText} ml-8`;
    }
  };

  const getHoverStyles = () => {
    if (depth === 0) {
      return "hover:shadow-xl hover:scale-105 hover:brightness-110";
    } else if (depth === 1) {
      return "hover:bg-white/90 hover:shadow-sm";
    } else {
      return "hover:bg-white/95";
    }
  };

  const getIcon = () => {
    if (item.icon) return item.icon;
    if (item.label.includes("Language") || item.label.includes("🎨"))
      return currentTheme.name === "universe" ? "🌟" : "🎨";
    if (item.label.includes("English") || item.label.includes("🇺🇸"))
      return "🇺🇸";
    if (item.label.includes("Writing") || item.label.includes("✏️"))
      return themeIcons.writing;
    if (item.label.includes("Math") || item.label.includes("🔢"))
      return themeIcons.math;
    if (item.label.includes("Settings") || item.label.includes("⚙️"))
      return themeIcons.settings;
    return currentTheme.name === "universe" ? "🚀" : "📚";
  };

  if (collapsed && depth === 0) {
    return (
      <li className="mb-2" title={item.label}>
        <div
          onClick={handleClick}
          className={`
            cursor-pointer px-3 py-4 rounded-xl transition-all duration-200
            flex items-center justify-center
            ${getItemStyles()}
            ${getHoverStyles()}
          `}
        >
          <span className="text-2xl">{getIcon()}</span>
        </div>
      </li>
    );
  }

  return (
    <li className="mb-2">
      <div
        onClick={handleClick}
        className={`
          cursor-pointer px-4 py-3 rounded-xl transition-all duration-200
          flex justify-between items-center
          ${getItemStyles()}
          ${getHoverStyles()}
          ${hasChildren ? "" : "hover:translate-x-1"}
        `}
      >
        <div className="flex items-center space-x-3">
          <span className="text-xl">{getIcon()}</span>
          <span className="select-none">{item.label}</span>
        </div>
        {hasChildren && !collapsed && (
          <div
            className={`
            transition-transform duration-200 text-2xl
            ${open ? "rotate-45" : "rotate-0"}
          `}
          >
            <span className="text-white">
              {currentTheme.name === "universe" ? "✨" : "🌿"}
            </span>
          </div>
        )}
      </div>
      {hasChildren && !collapsed && (
        <div
          className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${open ? "max-h-96 opacity-100 mt-2" : "max-h-0 opacity-0"}
        `}
        >
          <div className="bg-white/50 rounded-lg p-2 mx-2">
            <Sidebar
              items={item.children!}
              depth={depth + 1}
              collapsed={collapsed}
            />
          </div>
        </div>
      )}
    </li>
  );
}

function Sidebar(props: SidebarProps & { depth?: number }) {
  const { items, depth = 0, collapsed = false } = props;

  return (
    <ul className={depth === 0 ? "space-y-1" : "space-y-2"}>
      {items.map((item, index) => (
        <MenuItemComponent
          key={index}
          item={item}
          depth={depth}
          collapsed={collapsed}
        />
      ))}
    </ul>
  );
}
export { Sidebar, type MenuItem };

import { useState } from "react";
import { useNavigate } from "react-router-dom";

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
    if (collapsed && depth === 0) {
      return "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 font-bold text-sm shadow-sm border-l-4 border-purple-400 justify-center";
    }
    if (depth === 0) {
      return "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 font-bold text-lg shadow-sm border-l-4 border-purple-400";
    } else if (depth === 1) {
      return "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 font-semibold ml-4 border-l-2 border-blue-300";
    } else {
      return "bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 ml-8 hover:from-green-100 hover:to-emerald-100";
    }
  };

  const getHoverStyles = () => {
    if (depth === 0) {
      return "hover:from-purple-200 hover:to-pink-200 hover:shadow-md transform hover:scale-105";
    } else if (depth === 1) {
      return "hover:from-blue-100 hover:to-indigo-100 hover:shadow-sm";
    } else {
      return "hover:from-green-100 hover:to-emerald-100";
    }
  };

  const getIcon = () => {
    if (item.icon) return item.icon;
    if (item.label.includes("Language") || item.label.includes("🎨")) return "🎨";
    if (item.label.includes("English") || item.label.includes("🇺🇸")) return "🇺🇸";
    if (item.label.includes("Writing") || item.label.includes("✏️")) return "✏️";
    if (item.label.includes("Math") || item.label.includes("🔢")) return "🔢";
    return "📚";
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
            <span className="text-purple-500">✨</span>
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
            <Sidebar items={item.children!} depth={depth + 1} collapsed={collapsed} />
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
        <MenuItemComponent key={index} item={item} depth={depth} collapsed={collapsed} />
      ))}
    </ul>
  );
}
export { Sidebar, type MenuItem };

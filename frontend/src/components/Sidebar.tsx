import { useState } from "react";
import { useNavigate } from "react-router-dom";

type MenuItem = {
  label: string;
  path?: string;
  children?: MenuItem[];
};
type SidebarProps = {
  items: MenuItem[];
};

type MenuItemProps = {
  item: MenuItem;
};

function MenuItemComponent(props: MenuItemProps) {
  const { item } = props;
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const hasChildren = item.children && item.children.length > 0;

  const handleClick = () => {
    if (hasChildren) {
      setOpen(!open);
    } else if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <li className="mb-1">
      <div
        onClick={handleClick}
        className={`cursor-pointer px-2 py-1 rounded hover:bg-blue-100 flex justify-between items-center ${
          hasChildren ? "font-semibold text-blue-700" : "text-gray-700"
        }`}
      >
        <span>{item.label}</span>
        {hasChildren && (
          <span className="ml-2 text-sm">{open ? "−" : "+"}</span>
        )}
      </div>
      {hasChildren && open && <Sidebar items={item.children!} />}
    </li>
  );
}

function Sidebar(props: SidebarProps) {
  return (
    <ul className="pl-4">
      {props.items.map((item, index) => (
        <MenuItemComponent key={index} item={item} />
      ))}
    </ul>
  );
}
export { Sidebar, type MenuItem };

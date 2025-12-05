import "./Navbar.css";
import {Icons} from "../../assets";

interface NavItem {
    label: string;
    href: string;
}

const navItems: NavItem[] = [
    { label: "Home", href: "/" },
    { label: "Visualizer", href: "/visualizer" },
];

export default function Navbar() {
    return (
        <nav className="navbar">
            <div className="left-section">
                <img src={Icons.climbingShoe} alt="Home" className="logo"/>
            </div>

            <div className="nav-links">
                {navItems.map((item) => (
                    <a key={item.href} href={item.href} className="nav-item">
                        {item.label}
                    </a>
                ))}
            </div>

            <div className="right-section">
                <button className="burger-button">
                    <div className="burger-line"></div>
                    <div className="burger-line"></div>
                    <div className="burger-line"></div>
                </button>
            </div>
        </nav>
    );
}

import { FaCoffee, FaGithub } from "react-icons/fa";

export default function Footer() {
    return <footer className="p-2 text-sm border rounded-box border-base-300 bg-base-200">
        <div className="flex justify-center">
            &copy; 2025&nbsp;
            <a href="https://www.zephy.dev" className="link link-primary" rel="noopen norefferer" target="_blank">
                Kai Schuyler Gonzalez
            </a>
        </div>
        <div className="flex gap-2 justify-center">
            <div>
                <FaGithub className="inline" />&nbsp;
                <a href="https://github.com/kaischuygon/kino.wtf" className="link link-primary" rel="noopen norefferer" target="_blank">
                    source
                </a>
            </div>
            &bull;
            <div>
                <FaCoffee className="inline" />&nbsp; 
                <a href="https://www.buymeacoffee.com/kaischuyler" className="link link-primary" rel="noopen norefferer" target="_blank">
                    Buy me a coffee?
                </a>
            </div>
            &bull;
            <div>
                <a href="https://github.com/kaischuygon/kino.wtf/issues" className="link link-primary" rel="noopen norefferer" target="_blank">
                    Issues?
                </a>
            </div>
        </div>
    </footer>
}

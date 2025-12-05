import './Content5.css';

export default function Content5() {
    return (
        <div className="content-container5">
            <h2>Choisissez votre chemin</h2>
            <h3>Installer Linux sur les PC du lycée</h3>
            <ul>
                <li>⬆ Durée de vie du matériel</li>
                <li>⬇ Dépendance aux licences</li>
                <li>⬆ Autonomie numérique</li>
            </ul>
            <p className="italic">Score NIRD : +20</p>
            <h3>Racheter 50 PC neufs Windows 11</h3>
            <ul>
                <li>⬆ Dépense budget</li>
                <li>⬆ Empreinte carbone</li>
                <li>⬇ Durabilité</li>
            </ul>
            <p className="italic">Score NIRD : -10</p>
            <h3>Mutualiser les ressources libres entre enseignants</h3>
            <ul>
                <li>⬆ Communauté</li>
                <li>⬆ Pédagogie collaborative</li>
            </ul>
            <p className="italic">Score NIRD : +10</p>
            <h3>Utiliser les services cloud d’une Big Tech</h3>
            <ul>
                <li>⬆ Dépendance</li>
                <li>⬆ Risques RGPD</li>
            </ul>
            <p className="italic">Score NIRD : -5</p>
        </div>
    );
}
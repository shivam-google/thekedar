import { Link } from 'react-router-dom'
import { Icon } from './Icons'

export default function CategoryCard({ icon, eyebrow, title, description, path, tone }) {
  return <article className={`category-card ${tone}`}>
    <div className="category-top"><span className="category-icon"><Icon name={icon} size={26} /></span><span className="category-arrow"><Icon name="arrow" size={18} /></span></div>
    <div><p className="eyebrow">{eyebrow}</p><h3>{title}</h3><p className="category-description">{description}</p></div>
    <Link to={path} className="text-link">Browse category <Icon name="arrow" size={16} /></Link>
  </article>
}

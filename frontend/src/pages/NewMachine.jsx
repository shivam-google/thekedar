import LocationFields from '../components/LocationFields'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import { Icon } from '../components/Icons'
import { useAuth } from '../context/AuthContext'
import { createMachineListing, getOwnedMachine, updateMachineListing } from '../services/machineService'

const initialForm = { title: '', machine_type: '', brand: '', model: '', description: '', price: '', price_unit: 'per day', location: '', city: '', state: '', latitude: '', longitude: '', operator_available: false, delivery_available: false, contact_phone: '', availability_status: 'AVAILABLE' }
const validImageTypes = ['image/jpeg', 'image/png', 'image/webp']
const maxImageSize = 5 * 1024 * 1024

export default function NewMachine() {
  const { user } = useAuth()
  const { id } = useParams()
  const [loading, setLoading] = useState(Boolean(id))
  const [loadFailed, setLoadFailed] = useState(false)
  const [existingImages, setExistingImages] = useState(0)
  const [form, setForm] = useState(initialForm)
  const [selectedImages, setSelectedImages] = useState([])
  const selectedImagesRef = useRef([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [partialMachineId, setPartialMachineId] = useState(null)
  const [createdMachine, setCreatedMachine] = useState(null)
  const update = (name, value) => setForm((current) => ({ ...current, [name]: value }))

  useEffect(() => {
    if (!id) return
    let active = true
    setLoading(true)
    setLoadFailed(false)
    setPartialMachineId(null)
    selectedImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl))
    selectedImagesRef.current = []
    setSelectedImages([])
    getOwnedMachine(id).then((machine) => {
      if (!active) return
      setForm(Object.fromEntries(Object.keys(initialForm).map((key) => [key, machine[key] ?? initialForm[key]])))
      setExistingImages(machine.machine_images?.length || 0)
    }).catch((error) => { if (active) { setError(error.message); setLoadFailed(true) } }).finally(() => active && setLoading(false))
    return () => { active = false }
  }, [id])

  useEffect(() => () => selectedImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl)), [])

  const addImages = (event) => {
    setError('')
    const files = Array.from(event.target.files || [])
    if (files.length + selectedImages.length + existingImages > 5) { event.target.value = ''; return setError('A machine can have up to five images.') }
    const invalid = files.find((file) => !validImageTypes.includes(file.type) || file.size > maxImageSize)
    if (invalid) {
      setError('Images must be JPG, PNG, or WebP files smaller than 5 MB.')
      event.target.value = ''
      return
    }
    setSelectedImages((current) => {
      const next = [...current, ...files.map((file) => ({ file, previewUrl: URL.createObjectURL(file), id: `${file.name}-${file.lastModified}` }))]
      selectedImagesRef.current = next
      return next
    })
    event.target.value = ''
  }

  const removeImage = (imageId) => setSelectedImages((current) => {
    const removed = current.find((image) => image.id === imageId)
    if (removed) URL.revokeObjectURL(removed.previewUrl)
    const next = current.filter((image) => image.id !== imageId)
    selectedImagesRef.current = next
    return next
  })

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    const price = Number(form.price)
    if (!form.title.trim() || !form.machine_type.trim() || !form.price_unit.trim() || !form.city.trim() || !form.state.trim()) return setError('Complete all required fields.')
    if (!Number.isFinite(price) || price < 0) return setError('Enter a valid non-negative rental price.')
    if (form.price_unit.trim().length > 40) return setError('Price unit must be 40 characters or fewer.')
    if (!user?.id) return setError('Your session has expired. Please log in again.')
    setBusy(true)
    try {
      const save = id ? (details, images) => updateMachineListing(id, details, images) : createMachineListing
      const machine = await save({ owner_id: user.id, title: form.title.trim(), machine_type: form.machine_type.trim(), brand: form.brand.trim() || null, model: form.model.trim() || null, description: form.description.trim() || null, price, price_unit: form.price_unit.trim(), location: form.location.trim() || null, city: form.city.trim(), state: form.state.trim(), operator_available: form.operator_available, delivery_available: form.delivery_available, contact_phone: form.contact_phone.trim() || null, availability_status: form.availability_status, latitude: form.latitude, longitude: form.longitude }, selectedImages.map((image) => image.file))
      setCreatedMachine(machine)
    } catch (submitError) {
      setError(submitError.message)
      if (submitError.machineId) { setPartialMachineId(submitError.machineId); setLoadFailed(true) }
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="marketplace-state">Loading machine...</div>
  if (createdMachine) return <SuccessState machine={createdMachine} />

  return <div className="site-page"><Navbar /><main className="new-machine-page"><div className="form-heading"><Link to="/machines" className="text-link text-link-dark"><Icon name="arrow" size={16} className="back-arrow" /> Back to equipment</Link><p className="eyebrow eyebrow-orange">Provider workspace</p><h1>{id ? 'Edit Your' : 'List Your'} <em>Machine.</em></h1><p>Add your equipment so contractors and customers can discover and request it.</p></div><form className="machine-form" onSubmit={submit}><section className="form-section"><SectionHeading number="01" title="Machine details" copy="Start with the basics of what you are offering." /><div className="form-fields two-column"><Field label="Machine name" required value={form.title} onChange={(value) => update('title', value)} placeholder="e.g. Komatsu PC210 Excavator" /><Field label="Machine type" required value={form.machine_type} onChange={(value) => update('machine_type', value)} placeholder="e.g. Excavator" /><Field label="Brand" value={form.brand} onChange={(value) => update('brand', value)} placeholder="e.g. Komatsu" /><Field label="Model" value={form.model} onChange={(value) => update('model', value)} placeholder="e.g. PC210" /></div><label className="form-label">Description<textarea value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="What should a project owner know about this machine?" rows="4" /></label></section><section className="form-section"><SectionHeading number="02" title="Rental terms" copy="Set the price and current availability." /><div className="form-fields two-column"><Field label="Rental price" required type="number" min="0" value={form.price} onChange={(value) => update('price', value)} placeholder="0" /><Field label="Price unit" required value={form.price_unit} onChange={(value) => update('price_unit', value)} placeholder="per day" /><SelectField label="Availability" value={form.availability_status} onChange={(value) => update('availability_status', value)} options={['AVAILABLE', 'BOOKED', 'UNAVAILABLE']} /></div><div className="toggle-row"><Toggle checked={form.operator_available} onChange={(value) => update('operator_available', value)} title="Operator available" copy="Include an operator with the machine." /><Toggle checked={form.delivery_available} onChange={(value) => update('delivery_available', value)} title="Delivery available" copy="Offer delivery to the project site." /></div></section><section className="form-section"><SectionHeading number="03" title="Location & contact" copy="Help people understand where the machine is based." /><div className="form-fields two-column"><Field label="Location" value={form.location} onChange={(value) => update('location', value)} placeholder="Area or landmark" /><Field label="City" required value={form.city} onChange={(value) => update('city', value)} placeholder="City" /><Field label="State" required value={form.state} onChange={(value) => update('state', value)} placeholder="State" /><Field label="Contact phone" value={form.contact_phone} onChange={(value) => update('contact_phone', value)} placeholder="Optional" /></div></section><section className="form-section"><SectionHeading number="04" title="Machine images" copy="Add up to five real photos of your equipment." /><label className="upload-dropzone"><Icon name="image" size={25} /><strong>Choose machine images</strong><span>JPG, PNG, or WebP up to 5 MB each</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addImages} /></label>{selectedImages.length > 0 && <div className="image-preview-grid">{selectedImages.map((image) => <div className="image-preview" key={image.id}><img src={image.previewUrl} alt="Selected machine preview" /><button type="button" onClick={() => removeImage(image.id)} aria-label="Remove selected image"><Icon name="close" size={16} /></button></div>)}</div>}</section><LocationFields value={form} onChange={(values) => setForm((current) => ({ ...current, ...values }))} />{error && <p className="form-error" role="alert">{error}</p>}{partialMachineId && <Link className="button button-ghost" to={`/machines/${partialMachineId}/edit`}>Open the saved listing and retry images</Link>}<div className="form-actions"><Link to="/machines" className="button button-ghost">Cancel</Link><button type="submit" className="button" disabled={busy || loadFailed}>{busy ? 'Saving listing...' : id ? 'Save changes' : 'Submit listing'} <Icon name="arrow" size={17} /></button></div></form></main><Footer /></div>
}

function SuccessState({ machine }) { return <div className="site-page"><Navbar /><main className="success-page"><div className="success-panel"><span className="success-icon"><Icon name="check" size={30} /></span><p className="eyebrow eyebrow-orange">Provider workspace</p><h1>Machine listed <em>successfully.</em></h1><p>Your equipment is saved. Pending listings appear publicly after approval.</p><div className="success-actions"><Link to={`/machines/${machine.id}`} className="button">View machine <Icon name="arrow" size={17} /></Link><Link to="/machines" className="button button-ghost">Back to marketplace</Link></div></div></main><Footer /></div> }
function SectionHeading({ number, title, copy }) { return <div className="form-section-heading"><span>{number}</span><div><h2>{title}</h2><p>{copy}</p></div></div> }
function Field({ label, required = false, type = 'text', value, onChange, placeholder, min }) { return <label className="form-label">{label}{required && <span className="required-mark"> *</span>}<input required={required} type={type} min={min} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label> }
function SelectField({ label, value, onChange, options }) { return <label className="form-label">{label}<select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option.charAt(0) + option.slice(1).toLowerCase()}</option>)}</select></label> }
function Toggle({ checked, onChange, title, copy }) { return <label><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span><strong>{title}</strong><small>{copy}</small></span></label> }

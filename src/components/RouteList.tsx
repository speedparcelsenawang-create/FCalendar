import { useState, useEffect, useMemo } from "react"
import { Filter } from "lucide-react"

interface Company {
  id: number
  name: string
  slogan: string
  country: string
  rating: number
  color: string
  logo: string
  keywords: string[]
}

interface Filters {
  countries: Record<string, boolean>
  categories: Record<string, boolean>
  rating: number
}

export function RouteList() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [filters, setFilters] = useState<Filters>({
    countries: {},
    categories: {},
    rating: 0,
  })
  const [menus, setMenus] = useState({
    countries: false,
    categories: false,
    rating: false,
  })
  const [rating, setRating] = useState({ min: 10, max: 0 })

  useEffect(() => {
    fetch("https://s3-us-west-2.amazonaws.com/s.cdpn.io/450744/mock-data.json")
      .then((response) => response.json())
      .then((data: Company[]) => {
        setCompanies(data)

        const newFilters = { ...filters }
        let minRating = 10
        let maxRating = 0

        data.forEach(({ country, keywords, rating }) => {
          newFilters.countries[country] = false

          if (maxRating < rating) maxRating = rating
          if (minRating > rating) minRating = rating

          keywords.forEach((category) => {
            newFilters.categories[category] = false
          })
        })

        setFilters({ ...newFilters, rating: minRating })
        setRating({ min: minRating, max: maxRating })
      })
  }, [])

  const activeFilters = useMemo(() => {
    return {
      countries: Object.keys(filters.countries).filter(
        (c) => filters.countries[c]
      ),
      categories: Object.keys(filters.categories).filter(
        (c) => filters.categories[c]
      ),
      rating: filters.rating > rating.min ? [filters.rating] : [],
    }
  }, [filters, rating.min])

  const filteredList = useMemo(() => {
    return companies.filter(({ country, keywords, rating: companyRating }) => {
      if (companyRating < filters.rating) return false
      if (
        activeFilters.countries.length &&
        !activeFilters.countries.includes(country)
      )
        return false
      return (
        !activeFilters.categories.length ||
        activeFilters.categories.every((cat) => keywords.includes(cat))
      )
    })
  }, [companies, filters.rating, activeFilters])

  const setFilter = (filterType: keyof Filters, option: string) => {
    if (filterType === "countries") {
      setFilters({
        ...filters,
        [filterType]: {
          ...filters[filterType],
          [option]: !filters[filterType][option],
        },
      })
    } else if (filterType === "categories") {
      const newCategories = { ...filters.categories }
      Object.keys(newCategories).forEach((key) => {
        newCategories[key] = key === option && !newCategories[option]
      })
      setFilters({ ...filters, categories: newCategories })
    }
  }

  const clearFilter = (filterType: keyof Filters, except?: string) => {
    if (filterType === "rating") {
      setFilters({ ...filters, rating: rating.min })
    } else {
      const newFilter = { ...filters[filterType] }
      Object.keys(newFilter).forEach((option) => {
        if (except === undefined) {
          newFilter[option] = false
        } else {
          newFilter[option] = except === option && !newFilter[option]
        }
      })
      setFilters({ ...filters, [filterType]: newFilter })
    }
  }

  const clearAllFilters = () => {
    const newFilters = {
      countries: { ...filters.countries },
      categories: { ...filters.categories },
      rating: rating.min,
    }
    
    Object.keys(newFilters.countries).forEach((key) => {
      newFilters.countries[key] = false
    })
    
    Object.keys(newFilters.categories).forEach((key) => {
      newFilters.categories[key] = false
    })
    
    setFilters(newFilters)
  }

  const setMenu = (menu: keyof typeof menus, active: boolean) => {
    const newMenus = { countries: false, categories: false, rating: false }
    newMenus[menu] = !active
    setMenus(newMenus)
  }

  const hasActiveFilters =
    activeFilters.countries.length > 0 ||
    activeFilters.categories.length > 0 ||
    activeFilters.rating.length > 0

  return (
    <div className="relative font-light text-slate-700 dark:text-slate-300">
      {/* Filter Section */}
      <div className="flex items-center justify-center gap-4 px-4 py-6 max-w-3xl mx-auto">
        <Filter className="w-4 h-4" />

        {Object.keys(menus).map((menu) => (
          <div
            key={menu}
            className={`capitalize cursor-pointer relative ${
              menus[menu as keyof typeof menus] ? "after:content-['×'] after:text-red-400 after:ml-1" : ""
            } ${
              activeFilters[menu as keyof typeof activeFilters].length > 0
                ? "after:content-['•'] after:text-teal-400 after:ml-1"
                : ""
            }`}
            onClick={() =>
              setMenu(menu as keyof typeof menus, menus[menu as keyof typeof menus])
            }
          >
            {menu}
          </div>
        ))}

        <div
          className={`text-red-400 cursor-pointer transition-all ${
            hasActiveFilters
              ? "opacity-100 translate-x-0"
              : "opacity-0 -translate-x-4 pointer-events-none"
          }`}
          onClick={clearAllFilters}
        >
          Clear all
        </div>
      </div>

      {/* Dropdowns */}
      <div
        className="relative overflow-hidden transition-all duration-350 bg-slate-50 dark:bg-slate-800"
        style={{
          height:
            menus.countries || menus.categories || menus.rating ? "auto" : "0",
        }}
      >
        {menus.countries && (
          <div className="flex flex-wrap gap-2 p-4 max-w-3xl mx-auto">
            {Object.keys(filters.countries).map((country) => (
              <div
                key={country}
                className={`px-2 py-1 text-sm border rounded-md cursor-pointer transition-all ${
                  filters.countries[country]
                    ? "bg-teal-600 text-white border-teal-600"
                    : "border-slate-300 hover:border-teal-600 dark:border-slate-600 dark:hover:border-teal-500"
                }`}
                onClick={() => setFilter("countries", country)}
              >
                {country}
              </div>
            ))}
          </div>
        )}

        {menus.categories && (
          <div className="flex flex-wrap gap-2 p-4 max-w-3xl mx-auto">
            {Object.keys(filters.categories).map((category) => (
              <div
                key={category}
                className={`px-2 py-1 text-sm border rounded-md cursor-pointer transition-all ${
                  filters.categories[category]
                    ? "bg-teal-600 text-white border-teal-600"
                    : "border-slate-300 hover:border-teal-600 dark:border-slate-600 dark:hover:border-teal-500"
                }`}
                onClick={() => setFilter("categories", category)}
              >
                {category}
              </div>
            ))}
          </div>
        )}

        {menus.rating && (
          <div className="flex flex-col items-center p-6 max-w-3xl mx-auto">
            <output className="mb-4">
              <label>Minimum rating: </label>
              {filters.rating.toFixed(1)}
            </output>
            <input
              type="range"
              min={rating.min}
              max={rating.max}
              step="0.1"
              value={filters.rating}
              onChange={(e) =>
                setFilters({ ...filters, rating: parseFloat(e.target.value) })
              }
              className="w-48"
            />
          </div>
        )}
      </div>

      {/* Company List */}
      <ul className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pb-20 px-4 max-w-5xl mx-auto">
        {filteredList.map((company) => (
          <li
            key={company.id}
            className="flex flex-col justify-between bg-white rounded-lg border border-slate-300 shadow-sm hover:shadow-md transition-all"
          >
            <div className="p-3 text-center">
              <div
                className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                style={{ backgroundColor: company.color }}
              >
                {company.name.charAt(0)}
              </div>
              <h2 className="h-10 mb-3 text-lg font-extralight">
                {company.name}
              </h2>
              <blockquote className="h-8 text-sm font-normal capitalize">
                {company.slogan}
              </blockquote>
            </div>

            <ul className="flex justify-between mt-6 p-2 bg-slate-50 border-t border-slate-300">
              <li className="text-sm">
                <label className="text-xs block">Country</label>
                <p
                  className="cursor-pointer hover:underline"
                  onClick={() => clearFilter("countries", company.country)}
                >
                  {company.country}
                </p>
              </li>
              <li className="text-sm text-center">
                <label className="text-xs block">Rating</label>
                <p>{company.rating.toFixed(1)}</p>
              </li>
            </ul>
          </li>
        ))}
      </ul>
    </div>
  )
}

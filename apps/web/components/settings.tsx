"use client"

import { Moon, Sun } from "lucide-react"
import { useEffect } from "react"
import { Button } from "./ui/button"
import { useStored } from "./storage"

export function useExerciseStyle() {
  return useStored<"classic" | "modern">("exercise-style", "classic")
}

export function Settings() {
  const [style, setStyle] = useExerciseStyle()
  const [theme, setTheme] = useStored<"light" | "dark" | "system">("theme", "system")
  useEffect(() => {
    if (theme === "system") document.documentElement.removeAttribute("data-theme")
    else document.documentElement.dataset.theme = theme
  }, [theme])
  return (
    <div className="settings">
      <label>
        <span className="sr-only">Exercise interface</span>
        <select value={style} onChange={event => setStyle(event.target.value === "modern" ? "modern" : "classic")}>
          <option value="classic">Carnap Classic</option>
          <option value="modern">Modern</option>
        </select>
      </label>
      <Button variant="ghost" className="h-9 w-9 p-0" type="button" aria-label="Toggle light and dark theme" onClick={() => {
        const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches)
        setTheme(dark ? "light" : "dark")
      }}>
        <Sun className="theme-sun size-4" aria-hidden="true" />
        <Moon className="theme-moon size-4" aria-hidden="true" />
      </Button>
    </div>
  )
}

import { useState } from "react"
import { Plus, Trash2, ChevronLeft, ChevronRight, Image as ImageIcon, Pencil, MoreVertical, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface PlanoImage {
  id: string
  url: string
  title: string
  description: string
}

interface PlanoRow {
  id: string
  title: string
  images: PlanoImage[]
}

interface PlanoPage {
  id: string
  name: string
  rows: PlanoRow[]
}

export function PlanoVM() {
  const [pages, setPages] = useState<PlanoPage[]>([
    {
      id: "page-1",
      name: "Store Layout 1",
      rows: [
        {
          id: "row-1",
          title: "Top Shelf Products",
          images: [
            {
              id: "img-1",
              url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
              title: "Product 1",
              description: "Premium Headphones"
            },
            {
              id: "img-2",
              url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400",
              title: "Product 2",
              description: "Smart Watch"
            },
            {
              id: "img-3",
              url: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400",
              title: "Product 3",
              description: "Sunglasses"
            }
          ]
        },
        {
          id: "row-2",
          title: "Featured Collection",
          images: [
            {
              id: "img-4",
              url: "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=400",
              title: "Product 4",
              description: "Sneakers"
            },
            {
              id: "img-5",
              url: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400",
              title: "Product 5",
              description: "Backpack"
            }
          ]
        }
      ]
    }
  ])

  const [activePage, setActivePage] = useState<string>("page-1")
  const [addPageDialog, setAddPageDialog] = useState(false)
  const [addRowDialog, setAddRowDialog] = useState(false)
  const [editRowDialog, setEditRowDialog] = useState<{ open: boolean; rowId?: string }>({ open: false })
  const [deleteRowDialog, setDeleteRowDialog] = useState<{ open: boolean; rowId?: string }>({ open: false })
  const [addImageDialog, setAddImageDialog] = useState<{ open: boolean; rowId?: string }>({ open: false })
  const [editImageDialog, setEditImageDialog] = useState<{ open: boolean; rowId?: string; imageId?: string }>({ open: false })
  const [deleteImageDialog, setDeleteImageDialog] = useState<{ open: boolean; rowId?: string; imageId?: string }>({ open: false })
  const [hoveredImage, setHoveredImage] = useState<string | null>(null)
  
  const [newPageName, setNewPageName] = useState("")
  const [newRowTitle, setNewRowTitle] = useState("")
  const [editRowTitle, setEditRowTitle] = useState("")
  const [newImage, setNewImage] = useState({ url: "", title: "", description: "" })
  const [editImage, setEditImage] = useState({ url: "", title: "", description: "" })

  const currentPage = pages.find(p => p.id === activePage)

  const handleAddPage = () => {
    if (!newPageName) return
    
    const newPage: PlanoPage = {
      id: `page-${Date.now()}`,
      name: newPageName,
      rows: []
    }
    setPages([...pages, newPage])
    setActivePage(newPage.id)
    setNewPageName("")
    setAddPageDialog(false)
  }

  const handleAddRow = () => {
    if (!newRowTitle) return
    
    const newRow: PlanoRow = {
      id: `row-${Date.now()}`,
      title: newRowTitle,
      images: []
    }
    
    setPages(pages.map(page => 
      page.id === activePage 
        ? { ...page, rows: [...page.rows, newRow] }
        : page
    ))
    setNewRowTitle("")
    setAddRowDialog(false)
  }

  const handleEditRow = () => {
    if (!editRowTitle) return
    if (!editRowDialog.rowId) return
    
    setPages(pages.map(page => 
      page.id === activePage 
        ? {
            ...page,
            rows: page.rows.map(row => 
              row.id === editRowDialog.rowId
                ? { ...row, title: editRowTitle }
                : row
            )
          }
        : page
    ))
    
    setEditRowTitle("")
    setEditRowDialog({ open: false })
  }

  const handleMoveRowUp = (rowId: string) => {
    setPages(pages.map(page => {
      if (page.id !== activePage) return page
      
      const rowIndex = page.rows.findIndex(r => r.id === rowId)
      if (rowIndex <= 0) return page
      
      const newRows = [...page.rows]
      const temp = newRows[rowIndex]
      newRows[rowIndex] = newRows[rowIndex - 1]
      newRows[rowIndex - 1] = temp
      
      return { ...page, rows: newRows }
    }))
  }

  const handleMoveRowDown = (rowId: string) => {
    setPages(pages.map(page => {
      if (page.id !== activePage) return page
      
      const rowIndex = page.rows.findIndex(r => r.id === rowId)
      if (rowIndex >= page.rows.length - 1) return page
      
      const newRows = [...page.rows]
      const temp = newRows[rowIndex]
      newRows[rowIndex] = newRows[rowIndex + 1]
      newRows[rowIndex + 1] = temp
      
      return { ...page, rows: newRows }
    }))
  }

  const handleDeleteRow = () => {
    if (!deleteRowDialog.rowId) return
    
    setPages(pages.map(page => 
      page.id === activePage 
        ? { ...page, rows: page.rows.filter(row => row.id !== deleteRowDialog.rowId) }
        : page
    ))
    
    setDeleteRowDialog({ open: false })
  }

  const handleAddImage = () => {
    if (!newImage.url || !newImage.title) return
    if (!addImageDialog.rowId) return
    
    const image: PlanoImage = {
      id: `img-${Date.now()}`,
      ...newImage
    }
    
    setPages(pages.map(page => 
      page.id === activePage 
        ? {
            ...page,
            rows: page.rows.map(row => 
              row.id === addImageDialog.rowId
                ? { ...row, images: [...row.images, image] }
                : row
            )
          }
        : page
    ))
    
    setNewImage({ url: "", title: "", description: "" })
    setAddImageDialog({ open: false })
  }

  const handleEditImage = () => {
    if (!editImage.url || !editImage.title) return
    if (!editImageDialog.rowId || !editImageDialog.imageId) return
    
    setPages(pages.map(page => 
      page.id === activePage 
        ? {
            ...page,
            rows: page.rows.map(row => 
              row.id === editImageDialog.rowId
                ? { 
                    ...row, 
                    images: row.images.map(img => 
                      img.id === editImageDialog.imageId
                        ? { ...img, ...editImage }
                        : img
                    )
                  }
                : row
            )
          }
        : page
    ))
    
    setEditImage({ url: "", title: "", description: "" })
    setEditImageDialog({ open: false })
  }

  const handleDeleteImage = () => {
    if (!deleteImageDialog.rowId || !deleteImageDialog.imageId) return
    
    setPages(pages.map(page => 
      page.id === activePage 
        ? {
            ...page,
            rows: page.rows.map(row => 
              row.id === deleteImageDialog.rowId
                ? { ...row, images: row.images.filter(img => img.id !== deleteImageDialog.imageId) }
                : row
            )
          }
        : page
    ))
    
    setDeleteImageDialog({ open: false })
  }

  const scrollRow = (rowId: string, direction: 'left' | 'right') => {
    const element = document.getElementById(`row-${rowId}`)
    if (!element) return
    
    const scrollAmount = 400
    element.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    })
  }

  return (
    <div className="flex-1 bg-background min-h-screen">
      {/* Content */}
      <div className="px-8 py-6">
        {/* Title and Add Page Button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Plano VM</h1>
            <p className="text-muted-foreground mt-1">Visual Merchandising Planogram Manager</p>
          </div>
          
          <Dialog open={addPageDialog} onOpenChange={setAddPageDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4 mr-2" />
                Add Page
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Page</DialogTitle>
                <DialogDescription>Add a new planogram page</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input
                  placeholder="Page name (e.g., Store Layout 1)"
                  value={newPageName}
                  onChange={(e) => setNewPageName(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAddPageDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddPage}>Create Page</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Page Tabs */}
        <div className="mb-8">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {pages.map((page) => (
              <button
                key={page.id}
                onClick={() => setActivePage(page.id)}
                className={`px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activePage === page.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-accent"
                }`}
              >
                {page.name}
              </button>
            ))}
          </div>
        </div>

        {currentPage ? (
          <>
            <h2 className="text-2xl font-semibold mb-6">Rows</h2>

            {currentPage.rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <ImageIcon className="size-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No rows yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first row to start organizing planogram
                </p>
                <Button onClick={() => setAddRowDialog(true)}>
                  <Plus className="size-4 mr-2" />
                  Add First Row
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                {currentPage.rows.map((row, rowIndex) => (
                  <div key={row.id} className="border-b pb-8">
                    {/* Row Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <h3 className="text-xl font-semibold">{row.title}</h3>
                        <span className="text-sm text-muted-foreground">
                          {row.images.length} {row.images.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => scrollRow(row.id, 'left')}
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ChevronLeft className="size-5" />
                        </button>
                        <button
                          onClick={() => scrollRow(row.id, 'right')}
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ChevronRight className="size-5" />
                        </button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => {
                                const currentRow = currentPage.rows.find(r => r.id === row.id)
                                if (currentRow) {
                                  setEditRowTitle(currentRow.title)
                                  setEditRowDialog({ open: true, rowId: row.id })
                                }
                              }}
                            >
                              <Pencil className="size-4 mr-2" />
                              Edit Row
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleMoveRowUp(row.id)}
                              disabled={rowIndex === 0}
                            >
                              <ArrowUp className="size-4 mr-2" />
                              Move Up
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleMoveRowDown(row.id)}
                              disabled={rowIndex === currentPage.rows.length - 1}
                            >
                              <ArrowDown className="size-4 mr-2" />
                              Move Down
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setDeleteRowDialog({ open: true, rowId: row.id })}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="size-4 mr-2" />
                              Delete Row
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Horizontal Scroll */}
                    <div
                      id={`row-${row.id}`}
                      className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
                    >
                      {row.images.map((image) => (
                        <div 
                          key={image.id} 
                          className="flex-shrink-0 group"
                          onMouseEnter={() => setHoveredImage(image.id)}
                          onMouseLeave={() => setHoveredImage(null)}
                        >
                          <div className="relative w-48 h-48 rounded-lg overflow-hidden bg-muted">
                            <img
                              src={image.url}
                              alt={image.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E"
                              }}
                            />
                            {hoveredImage === image.id && (
                              <div className="absolute inset-0 bg-black/80 flex items-center justify-center gap-3 transition-opacity duration-200">
                                <Button
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={() => {
                                    const img = row.images.find(i => i.id === image.id)
                                    if (img) {
                                      setEditImage({ url: img.url, title: img.title, description: img.description })
                                      setEditImageDialog({ open: true, rowId: row.id, imageId: image.id })
                                    }
                                  }}
                                >
                                  <Pencil className="size-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                  onClick={() => setDeleteImageDialog({ open: true, rowId: row.id, imageId: image.id })}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="mt-3">
                            <p className="font-medium text-sm truncate">{image.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{image.description}</p>
                          </div>
                        </div>
                      ))}
                      
                      {/* Add Image Card */}
                      <div className="flex-shrink-0">
                        <button
                          onClick={() => setAddImageDialog({ open: true, rowId: row.id })}
                          className="w-48 h-48 rounded-lg border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all duration-200 flex items-center justify-center group cursor-pointer"
                        >
                          <div className="text-center">
                            <Plus className="size-12 text-primary group-hover:scale-110 mx-auto mb-2 transition-transform" />
                            <p className="text-sm text-muted-foreground group-hover:text-primary transition-colors">Add Image</p>
                          </div>
                        </button>
                      </div>
                      
                      {row.images.length === 0 && (
                        <div className="flex items-center justify-center w-full py-12 text-center">
                          <div>
                            <ImageIcon className="size-12 text-muted-foreground/50 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No images in this row</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Add Row Button at Bottom */}
            {currentPage.rows.length > 0 && (
              <div className="mt-8 flex justify-center">
                <Dialog open={addRowDialog} onOpenChange={setAddRowDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="lg">
                      <Plus className="size-4 mr-2" />
                      Add Row
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Row</DialogTitle>
                      <DialogDescription>Add a new product row</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <Input
                        placeholder="Row title (e.g., Top Shelf Products)"
                        value={newRowTitle}
                        onChange={(e) => setNewRowTitle(e.target.value)}
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setAddRowDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddRow}>Create Row</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <h3 className="text-lg font-semibold mb-2">No page selected</h3>
            <p className="text-sm text-muted-foreground">Create a page to get started</p>
          </div>
        )}
      </div>

      {/* Add Image Dialog */}
      <Dialog open={addImageDialog.open} onOpenChange={(open) => setAddImageDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Image</DialogTitle>
            <DialogDescription>Add a new product image to the row</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Image URL *</label>
              <Input
                placeholder="https://example.com/image.jpg"
                value={newImage.url}
                onChange={(e) => setNewImage({ ...newImage, url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Title *</label>
              <Input
                placeholder="Product name"
                value={newImage.title}
                onChange={(e) => setNewImage({ ...newImage, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="Product description"
                value={newImage.description}
                onChange={(e) => setNewImage({ ...newImage, description: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddImageDialog({ open: false })}>
                Cancel
              </Button>
              <Button onClick={handleAddImage} disabled={!newImage.url || !newImage.title}>
                Add Image
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Image Dialog */}
      <Dialog open={editImageDialog.open} onOpenChange={(open) => setEditImageDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Image</DialogTitle>
            <DialogDescription>Update product image details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Image URL *</label>
              <Input
                placeholder="https://example.com/image.jpg"
                value={editImage.url}
                onChange={(e) => setEditImage({ ...editImage, url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Title *</label>
              <Input
                placeholder="Product name"
                value={editImage.title}
                onChange={(e) => setEditImage({ ...editImage, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="Product description"
                value={editImage.description}
                onChange={(e) => setEditImage({ ...editImage, description: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditImageDialog({ open: false })}>
                Cancel
              </Button>
              <Button onClick={handleEditImage} disabled={!editImage.url || !editImage.title}>
                Update Image
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Image Confirmation */}
      <Dialog open={deleteImageDialog.open} onOpenChange={(open) => setDeleteImageDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Image</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this image? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteImageDialog({ open: false })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteImage}>
              <Trash2 className="size-4 mr-2" />
              Delete Image
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Row Dialog */}
      <Dialog open={editRowDialog.open} onOpenChange={(open) => setEditRowDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Row</DialogTitle>
            <DialogDescription>Update row title</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Row title (e.g., Top Shelf Products)"
              value={editRowTitle}
              onChange={(e) => setEditRowTitle(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditRowDialog({ open: false })}>
                Cancel
              </Button>
              <Button onClick={handleEditRow} disabled={!editRowTitle}>
                Update Row
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Row Confirmation */}
      <Dialog open={deleteRowDialog.open} onOpenChange={(open) => setDeleteRowDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Row</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this row and all its images? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteRowDialog({ open: false })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRow}>
              <Trash2 className="size-4 mr-2" />
              Delete Row
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

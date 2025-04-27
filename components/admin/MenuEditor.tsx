import { useState } from 'react';

// Define interfaces for the menu structure
interface MenuItem {
  name: string;
  description?: string; // Optional description
  price: string; // Price might be a string or number depending on AI
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

interface DigitalMenu {
  sections: MenuSection[];
}

export default function MenuEditor() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [digitalMenu, setDigitalMenu] = useState<DigitalMenu | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setDigitalMenu(null); // Clear previous menu
      setError(null);       // Clear previous error
    }
  };

  const processMenuImage = async () => {
    if (!selectedImage) return;

    setIsLoading(true);
    setError(null);
    setDigitalMenu(null);

    try {
      // --- Placeholder for AI call ---
      // Replace this with your actual API call to the AI service
      // const formData = new FormData();
      // formData.append('menuImage', selectedImage);
      // const response = await fetch('/api/process-menu', { // Your API endpoint
      //   method: 'POST',
      //   body: formData,
      // });
      // if (!response.ok) {
      //   throw new Error('Failed to process menu image.');
      // }
      // const processedMenu: DigitalMenu = await response.json();

      // Simulate a delay and successful response
      await new Promise(resolve => setTimeout(resolve, 1500));
      const processedMenu: DigitalMenu = { // Sample Data
        sections: [
          {
            title: "Appetizers",
            items: [
              { name: "Spring Rolls", description: "Crispy fried veggie rolls", price: "$5.99" },
              { name: "Garlic Bread", price: "$4.50" },
            ],
          },
          {
            title: "Main Courses",
            items: [
              { name: "Grilled Salmon", description: "Served with roasted vegetables", price: "$18.99" },
              { name: "Pasta Carbonara", description: "Creamy pasta with bacon", price: "$15.50" },
            ],
          },
        ],
      };
      // --- End Placeholder ---

      setDigitalMenu(processedMenu);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div >
      <h2>Upload Menu Image</h2>
      <input type="file" accept="image/*" onChange={handleFileChange} />

      {selectedImage && (
        <button onClick={processMenuImage} disabled={isLoading}>
          {isLoading ? 'Processing...' : 'Generate Digital Menu'}
        </button>
      )}

      {isLoading && <p>Processing image, please wait...</p>}

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {digitalMenu && (
        <div>
          <h2>Digital Menu</h2>
          {digitalMenu.sections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <h3>{section.title}</h3>
              <ul>
                {section.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <strong>{item.name}</strong> - {item.price}
                    {item.description && <p><small>{item.description}</small></p>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import fitz
import json

# Load the PDF file
pdf_path = "C:/Users/Eric/OneDrive/40K Indexes/Space Marines/Dark Angels Index.pdf"
output_json = "Dark_Angels.json"

# Initialize list to store page text data
pdf_data = []

# Open the PDF
pdf_document = fitz.open(pdf_path)

# Loop through each page and extract the text
for page_num in range(len(pdf_document)):
    page = pdf_document.load_page(page_num)
    text = page.get_text("text")  # Extract raw text from the page

    # Store page number and extracted text
    page_data = {
        "page_number": page_num + 1,
        "text": text.strip()  # Strip unnecessary spaces
    }

    pdf_data.append(page_data)

# Save the extracted text to a JSON file
with open(output_json, "w") as json_file:
    json.dump(pdf_data, json_file, indent=4)

print(f"Text extracted and saved to {output_json}")

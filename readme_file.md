# Mind Map Generator API

This is a REST API that generates interactive mind map HTML files based on user input.

## API Endpoint

Once deployed, your API will be available at:
```
POST https://your-project-name.vercel.app/api/generate-mindmap
```

## Request Format

```json
{
  "data": "Your content here - can be a list, steps, or any text"
}
```

## Response Format

```json
{
  "success": true,
  "html": "<!DOCTYPE html>...",
  "message": "Mind map generated successfully"
}
```

## Testing

You can test the API using curl:

```bash
curl -X POST https://your-project-name.vercel.app/api/generate-mindmap \
  -H "Content-Type: application/json" \
  -d '{"data": "Planning a vacation: book flights, reserve hotel, pack luggage, research attractions"}'
```

## Integration with Copilot Studio

1. Use REST API connector
2. Method: POST
3. URL: https://your-project-name.vercel.app/api/generate-mindmap
4. Headers: Content-Type: application/json
5. Body: {"data": "{{user_input}}"}
